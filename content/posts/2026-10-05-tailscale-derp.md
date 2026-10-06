---
title: "A deep dive into Tailscale's DERP protocol"
layout: "page.njk"
date: "2026-10-05"
permalink: "/tailscale-derp/"
---

A key component of Tailscale is its fleet of relay servers. These servers run a custom protocol called DERP (Designated Encrypted Relay for Packets), which lets nodes exchange endpoint information and fall back to a relayed connection when a direct connection is not possible. The servers route packets by WireGuard public key. A client connects, proves it owns the matching private key, and keeps the connection open. Other clients can then send packets to that client through the relay by addressing them to its public key.

Knowing the WireGuard public key of the recipient and the DERP region they are connected to is enough to address traffic to them through the relay. Public DERP servers are rate-limited in practice, and a node drops WireGuard packets from unknown peers. Tailscale's control plane distributes nodes' public keys to peers. These public keys are intended to remain encrypted on the wire.

Below, I'll show how to use DERP to set up bidirectional communication between two clients. We'll do this in about 40 lines of Python, using PyNaCl as the only third-party dependency.

## Framing

DERP messages consist of a type, length, and message body.

```python
MAGIC = "DERP🔑".encode()
SERVER_KEY, CLIENT_INFO, SEND_PACKET, RECV_PACKET = 1, 2, 4, 5


def read_frame(f):
    typ, n = struct.unpack(">BI", f.read(5))
    return typ, f.read(n)


def write_frame(sock, typ, body):
    sock.sendall(struct.pack(">BI", typ, len(body)) + body)
```

## Connecting

The connection starts with an ordinary HTTPS request and is upgraded to DERP.

```python
url = urlsplit(sys.argv[1])
sock = socket.create_connection((url.hostname, url.port or 443))
sock = ssl.create_default_context().wrap_socket(sock, server_hostname=url.hostname)
sock.sendall(
    f"GET {url.path} HTTP/1.1\r\nHost: {url.hostname}\r\n"
    "Connection: Upgrade\r\nUpgrade: DERP\r\n\r\n".encode()
)
f = sock.makefile("rb")
assert b" 101 " in f.readline(), "server refused the DERP upgrade"
while f.readline() not in (b"\r\n", b""):
    pass
```

## Handshake

The client and server exchange public keys. The server announces its key, and the client answers with its own key and a NaCl box, sealed to the server, containing the client's protocol version.

```python
typ, body = read_frame(f)
assert typ == SERVER_KEY and body.startswith(MAGIC)
server = PublicKey(body[len(MAGIC) : len(MAGIC) + 32])
me = PrivateKey.generate()
info = Box(me, server).encrypt(b'{"version":2}')
write_frame(sock, CLIENT_INFO, bytes(me.public_key) + info)
print("my key:", bytes(me.public_key).hex(), flush=True)
```

## Sending and receiving

Packets are addressed to the peer's public key and relayed by the server.

```python
peer = bytes.fromhex(sys.argv[2]) if len(sys.argv) > 2 else None


def receive():
    global peer
    while True:
        typ, body = read_frame(f)
        if typ == RECV_PACKET:
            peer = body[:32]
            print(f"{peer.hex()[:8]}: {body[32:].decode(errors='replace')}", flush=True)


threading.Thread(target=receive, daemon=True).start()
for line in sys.stdin:
    write_frame(sock, SEND_PACKET, peer + line.rstrip("\n").encode())
```

## Result

Two clients, `A` and `B`, can connect to the same DERP server (the one below is from [Tailcat](https://github.com/tailscale/tailcat)). `A` prints its key and waits:

```text
$ python3 derp.py https://tc301a.ipn.dev/derp
my key: dea9abc4abeb62c7098758edbbd06f380f8796c50c2847cd4afc0012432e1d34
```

`B` connects with `A`'s key and sends a line:

```text
$ python3 derp.py https://tc301a.ipn.dev/derp dea9abc4abeb62c7098758edbbd06f380f8796c50c2847cd4afc0012432e1d34
my key: 97d5ab10d70c3b6bb230546b4d78d1f18d9fe016eae3bb32992ccfd212fd9567
hello
```

`A` receives it and can reply:

```text
97d5ab10: hello
hi back
```

`B` receives the reply:

```text
dea9abc4: hi back
```

The connections to the DERP server are encrypted with TLS, but the server still sees both public keys and the payload. The payload is not encrypted end to end unless we encrypt it separately. Normal Tailscale traffic already has that additional encryption through WireGuard.

Self-hosted DERP servers can require additional client verification, while Tailscale's public relays do not appear to require registration with its control plane. For example, [Headscale](https://headscale.net/stable/ref/derp/) uses these public relays by default. Tailscale employee Brad Fitzpatrick wrote on [Hacker News](https://news.ycombinator.com/item?id=49455652) that "it's been our CEO Avery's position for ~6.5 years now that we should run DERP servers on the internet for the public good."

Tailscale's DERP servers are meshed within each region, allowing them to forward packets between clients connected to different servers. This lets clients reconnect to another server in the region during maintenance or an outage. Clients try servers within a region in a supplied priority order for failover, rather than choosing them based on current load.

## Conclusion

DERP relays, which can connect peers behind NATs, can also be used to bootstrap a direct WireGuard connection without a separate control plane. This is the idea behind [Headwire](https://github.com/brofranks/headwire), a small side project I built and have been running for a little while. Headwire translates a static WireGuard-style configuration into the peer and relay maps expected by Tailscale's `magicsock` library, which probes UDP paths and selects between direct and relayed connections.

Headwire supports Linux and [macOS](https://github.com/brofranks/headwire-apple). There is also an iOS app, but it is unlikely to be distributed on the App Store anytime soon because Apple requires VPN apps to be published through an organization developer account. Headwire is not designed to be a full replacement for Tailscale. It goes beyond basic WireGuard with features such as inbound ACLs and IP masquerading, inherited from Tailscale's data plane library. It also benefits from the [performance optimizations](https://tailscale.com/blog/making-tailscale-faster) Tailscale has made to its fork of wireguard-go.
