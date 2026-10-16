# Rotating Proxies

Rotating proxies let you expose stable listener endpoints while Magpie rotates upstream proxies from your healthy pool.

For a guided setup and curl request, follow
[your first proxy workflow](../learn/first-proxy.md#5-create-a-rotating-listener).
The [rotation internals chapter](../backend/rotation.md) explains current TCP
evidence, cursor selection, and tunnel behavior.

## Endpoints

- `GET /api/rotatingProxies`
- `POST /api/rotatingProxies`
- `DELETE /api/rotatingProxies/{id}`
- `POST /api/rotatingProxies/{id}/next`

## Create payload

```json
{
  "name": "residential-good",
  "instance_id": "your-backend-instance-id",
  "protocol": "http",
  "listen_protocol": "http",
  "transport_protocol": "tcp",
  "listen_transport_protocol": "tcp",
  "auth_required": false,
  "reputation_labels": ["good", "neutral"]
}
```

Use an actual instance ID returned by `GET /api/rotatingProxies/instances`.
The UI's instance selector uses this list. It includes instances with free
listener ports; the example string above is a placeholder.

## Validation behavior

- `name` is required and max length is 120
- `instance_id` must select an available backend instance with free listener ports
- `protocol` must be enabled in the active workspace's Default settings
- `auth_required=true` requires both username and password
- listener ports are allocated from configured rotating port range

## Protocol and transport notes

- Upstream proxy protocol can be `http|https|socks4|socks5`
- Listener protocol defaults to upstream protocol
- Transport supports `tcp`, `quic`, and `http3`
- SOCKS listeners require TCP transport
- Upstream proxies can use provider hostnames, IPv4, or IPv6. IPv6 listener and upstream endpoints use bracketed `host:port` notation. Provider hostnames use normal `host:port` notation and resolve when the rotator connects.
- Only active managed proxies in the rotator's workspace are eligible upstreams.

Upstream connections currently use TCP, including when the incoming listener
uses QUIC or HTTP/3. A candidate needs a successful TCP check for the rotator's
workspace and current effective checker settings. A tag rule can remove that
check or change it to QUIC, which makes that route ineligible for TCP rotation.
Results from another workspace or an older configuration do not qualify it.
Uptime filters also use that workspace's matching TCP evidence. After an
upgrade or a settings change, rotation waits for applicable checks to complete.
