// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

import { assertEquals } from "../../../test_util/std/assert/mod.ts";
import { execCode } from "../unit/test_util.ts";
import { createSocket } from "node:dgram";

const listenPort = 4503;
const listenPort2 = 4504;

Deno.test("[node/dgram] udp ref and unref", {
  permissions: { read: true, run: true, net: true },
}, async () => {
  const { promise, resolve } = Promise.withResolvers<Uint8Array>();

  const udpSocket = createSocket("udp4");
  udpSocket.bind(listenPort);

  udpSocket.unref();
  udpSocket.ref();

  udpSocket.on("message", (buffer, _rinfo) => {
    resolve(Uint8Array.from(buffer));
  });

  const conn = await Deno.listenDatagram({
    port: listenPort2,
    transport: "udp",
  });
  await conn.send(new Uint8Array([0, 1, 2, 3]), {
    transport: "udp",
    port: listenPort,
    hostname: "127.0.0.1",
  });

  const data = await promise;
  assertEquals(data, new Uint8Array([0, 1, 2, 3]));
});

Deno.test("[node/dgram] udp unref", {
  permissions: { read: true, run: true, net: true },
}, async () => {
  const [statusCode, _output] = await execCode(`
      import { createSocket } from "node:dgram";
      const udpSocket = createSocket('udp4');
      udpSocket.bind(${listenPort2});

      // This should let the program to exit without waiting for the
      // udp socket to close.
      udpSocket.unref();

      udpSocket.on('message', (buffer, rinfo) => {
      });
    `);
  assertEquals(statusCode, 0);
});