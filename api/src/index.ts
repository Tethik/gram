import { initConfig } from "@gram/config";
initConfig(); // Must do this before loading config
import { configureLogging } from "@gram/core/dist/logger/index.js";
configureLogging();

import http from "http";
import { createApp } from "./app.js";
import { createControlApp } from "./controlApp.js";
import { bootstrap } from "@gram/core/dist/bootstrap.js";
import log4js from "log4js";
import { notificationSender } from "@gram/core/dist/notifications/sender.js";
import { attachWebsocketServer } from "./ws/index.js";
import { config } from "@gram/core/dist/config/index.js";

const NOTIFICATION_INTERVAL = 1000 * 30; // 30 seconds

const log = log4js.getLogger("api");

// Catch and log unhandled errors
const handleUnhandledError = (err: Error) => {
  log.fatal("unhandled error occured", err);
};
process.on("unhandledRejection", handleUnhandledError);
process.on("uncaughtException", handleUnhandledError);

const listen = async () => {
  log.info(`Starting gram@${process.env.npm_package_version}`);
  const dal = await bootstrap();

  // Create Express Apps
  const app = await createApp(dal);
  const controlApp = createControlApp(dal);

  // Bootstrap packs with custom functionality / addons

  // Set up HTTP servers and start listening
  const appPort = config.appPort;
  const appServer = http.createServer(app);
  // Attach websocket handler
  attachWebsocketServer(appServer, dal);
  await appServer.listen(appPort);
  log.info(`appServer - listening to ${appPort}`);

  const controlPort = config.controlPort;
  const controlServer = http.createServer(controlApp);
  await controlServer.listen(controlPort);
  log.info(`controlServer - listening to ${controlPort}`);

  // Set up async processes (notification sender)
  setInterval(
    () => notificationSender(dal.notificationService, dal.templateHandler),
    NOTIFICATION_INTERVAL
  );
};

listen();
