---
description: "Create and inspect rotating listeners, choose an instance, and test upstream selection with the REST API."
---

# REST: rotating proxies

Rotating proxies expose stable listener ports and rotate through alive upstream proxies.

The API configures listeners. Your application sends proxy traffic to the
allocated listener host/port, using its listener protocol and credentials.
The API bearer token is not a listener password.

## Create and verify a listener

1. Read `GET /api/rotatingProxies/instances` and select an available ID.
2. Confirm the upstream protocol is enabled in workspace Default settings and
   that active routes have current successful TCP evidence for it.
3. Create the rotator with that instance ID. For access by other clients, supply
   listener authentication with dedicated username/password values.
4. Read the created/listed rotator's `listen_address` and allocated port.
5. Send a real proxy request through that listener. The
   [first curl workflow](../learn/first-proxy.md#5-create-a-rotating-listener)
   shows an HTTP listener example.

Start with broad pool filters while diagnosing eligibility, then narrow them.
The creation example below includes uptime and reputation filters to illustrate
their fields; those filters can legitimately leave an empty pool.

## Selection behavior

Only active management in the selected workspace qualifies. A route needs
successful current TCP evidence for the upstream protocol, plus any reputation
and uptime conditions. Listener transport does not change the current TCP
upstream requirement. Settings refreshes can temporarily make eligibility
unknown. See [rotation internals](../backend/rotation.md).

`POST .../next` advances the persisted cursor and returns upstream credentials.
It is a selection operation, not a read-only preview. Established CONNECT/SOCKS
tunnels keep their upstream while they remain open.

## `GET /api/rotatingProxies`

Requires viewer or higher. Lists rotators owned by the selected workspace.

Response:

```json
{
  "rotating_proxies": [
    {
      "id": 5,
      "name": "res-good",
      "instance_id": "proxy-node-1",
      "instance_name": "Proxy Node 1",
      "instance_region": "us-east-1",
      "protocol": "http",
      "listen_protocol": "http",
      "transport_protocol": "tcp",
      "listen_transport_protocol": "tcp",
      "uptime_filter_type": "min",
      "uptime_percentage": 95,
      "alive_proxy_count": 340,
      "listen_port": 20042,
      "auth_required": false,
      "listen_host": "2001:db8::10",
      "listen_address": "[2001:db8::10]:20042",
      "reputation_labels": ["good", "neutral"],
      "created_at": "2026-02-12T10:00:00Z"
    }
  ]
}
```

## `POST /api/rotatingProxies`

Requires operator or higher in the selected workspace.

Request:

```json
{
  "name": "res-good",
  "instance_id": "proxy-node-1",
  "protocol": "http",
  "listen_protocol": "http",
  "transport_protocol": "tcp",
  "listen_transport_protocol": "tcp",
  "uptime_filter_type": "min",
  "uptime_percentage": 95,
  "auth_required": false,
  "auth_username": "",
  "auth_password": "",
  "reputation_labels": ["good", "neutral"]
}
```

Validation and behavior:

- `name` required, max length 120, unique per workspace.
- `instance_id` required and must be one of the currently available instances with free listener ports.
- `protocol` required and must be enabled in the workspace's Default protocol settings.
- `auth_required=true` requires non-empty `auth_username` and `auth_password`.
- `reputation_labels` supports `good`, `neutral`, `poor`.
- Optional uptime filter requires a valid pair:
  - `uptime_filter_type`: `min` or `max`
  - `uptime_percentage`: `0..100`
- Listener port is allocated from `ROTATING_PROXY_PORT_START`..`ROTATING_PROXY_PORT_END`.

Status mapping:

- `201`: created
- `400`: validation errors
- `404`: rotator not found (delete/next)
- `409`: conflict (name exists, or no alive proxies for next)
- `503`: no available rotator ports / no available instances with free ports

An empty instances response is not solved by retrying the same `instance_id`.
Check heartbeat availability, the instance's stable identity, assigned listeners,
and port capacity. A `409` from `/next` calls for inspecting route eligibility
in that workspace.

## `GET /api/rotatingProxies/instances`

Requires viewer or higher. Returns only instances that currently have free rotator listener ports.

Response:

```json
{
  "instances": [
    {
      "id": "proxy-node-1",
      "name": "Proxy Node 1",
      "region": "us-east-1",
      "port_start": 20000,
      "port_end": 20100,
      "used_ports": 12,
      "free_ports": 89,
      "total_ports": 101
    }
  ]
}
```

## `DELETE /api/rotatingProxies/{id}`

Requires operator or higher in the selected workspace.

- Success: `204 No Content`

## `POST /api/rotatingProxies/{id}/next`

Requires viewer or higher. Returns the next active managed proxy that will be
served from the selected workspace.

Response:

```json
{
  "proxy_id": 12345,
  "ip": "gateway.provider.example",
  "port": 8080,
  "username": "u",
  "password": "p",
  "has_auth": true,
  "protocol": "http"
}
```

The `ip` property may contain a provider hostname despite its compatibility name. Clients must combine an IPv6 value and port as `[ip]:port`; hostnames use `hostname:port`.
