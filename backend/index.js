const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectdb = require('./config/dbConnect');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRoute = require('./routes/authRoute');
const chatRoute = require('./routes/chatRoute');
const statusRoute = require('./routes/statusRoute')
const initSocket = require('./services/socketService');
const http = require('http')

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const corsOption = {
  origin: process.env.FRONTEND_URL,
  credentials: true // to allow cookies to be sent
}


// 🔐 Middleware
app.use(cors(corsOption));

app.use(express.json()); // For JSON payloads
app.use(cookieParser()); // For reading cookies
app.use(bodyParser.urlencoded({ extended: true })); // For form submissions

// 🧩 Connect to MongoDB
connectdb();

//create server
const server = http.createServer(app)
const io = initSocket(server)
//apply socket middleware before routes
app.use((req, res, next) =>{
  req.io = io
  req.socketUserMap = io.socketUserMap
  next
})
 
// 🛣️ Routes
app.use('/api/auth', authRoute);
app.use('api/chat', chatRoute);
app.use('api/status', statusRoute);

// 🚀 Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port: ${PORT}`);
});
