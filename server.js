const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
app.use(cors());
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
// 服务器socket连接
io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    socket.broadcast.emit("断开连接");
  });
});
server.listen(5000, () => {
  console.log("http://127.0.0.1:5000服务已启动");
});
