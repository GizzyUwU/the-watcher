import YAML from "yaml";
import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function GET() {
  const raw = fs.readFileSync("config.yaml").toString();
  const data = YAML.parse(raw);

  var monitors = [];

  const db = await open({
    filename: "database.db",
    driver: sqlite3.Database,
  });

  for (var i = 0; i < data.monitors.length; i++) {
    var pings = await db.all(
      "SELECT * FROM Pings WHERE id = ? ORDER BY time DESC limit 100",
      data.monitors[i].unique_id,
    );

    const avgPing = await db.get(
      "SELECT AVG(ping) as avg FROM Pings WHERE id = ? AND (status = 'up' OR status = 'degraded')",
      [data.monitors[i].unique_id],
    );

    const uptime = await db.get(
      "SELECT COUNT(*) as up, (SELECT COUNT(*) FROM Pings WHERE id = ? AND status != 'paused' ) as total FROM Pings WHERE id = ? AND (status = 'up' OR status = 'degraded')",
      [data.monitors[i].unique_id, data.monitors[i].unique_id],
    );

    const percentage = (uptime.up / uptime.total) * 100;

    monitors.push({
      name: data.monitors[i].name,
      interval: data.monitors[i].interval,
      paused: data.monitors[i].paused,
      unique_id: data.monitors[i].unique_id,
      avg_ping: avgPing.avg,
      uptime: percentage,
      heartbeats: pings,
    });
  }

  return {
    title: data.title,
    description: data.description,
    footer: data.footer,
    online_statuses: data.onlineStatuses,
    monitors: monitors,
  };
}
