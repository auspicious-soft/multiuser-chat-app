const express = require('express');
var bodyParser = require('body-parser');
const cors = require('cors');
var mongoose = require('mongoose');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors({
    origin: "http://localhost:3002" // Replace with the origin you want to allow
}));

var dbUrl = 'mongodb://localhost:27017/multi-user-chat';

var Chat = mongoose.model('messages',{ fromUser : String, toUser : String, message : String});
var User = mongoose.model('users',{ socket_id : String, name : String});

let users = {};

async function connectDB() {
  try {
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
  }
}

connectDB();

io.on('connection', (socket) => {
  console.log('a user connected');
    
  socket.on('join', (username) => {
    users[socket.id] = username;

    var onlineUser = { 
      "socket_id":socket.id,
      "name":username
    };

    const newDocument = new User(onlineUser);
    const savedDocument = newDocument.save();
    console.log(username + " is online...");
    
  });

  socket.on('message', async (data) => {  

    const newMessage = new Chat(data);
    const savedMessage = newMessage.save();
    
    var userData = {"name":data.toUser};

    const result = await User.findOne(userData);

    if(result!=null)
      socket.to(result.socket_id).emit('message',{ user: users[socket.id], text: data.message });
  });

  socket.on('disconnect', async () => {
    const myquery = { socket_id: socket.id };  
    await User.findOneAndDelete(myquery);      
    delete users[socket.id];
    console.log("User " + socket.id + "went offline...");
  });

});

var server = http.listen(3002, () => {
    console.log('server is running on port', server.address().port);
});