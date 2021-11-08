const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");


const port = process.env.PORT || 5000;

var serviceAccount = JSON.parse(process.env.FIREBASE_SECURE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3zhcn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer '))
  {
    const token = req.headers.authorization.split(' ')[ 1 ];

    try
    {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
   }
    catch {
      
   }
  }
      next();
}

async function run() {
    try
    {
        await client.connect()
        const database = client.db('doctors_portal');
      const appointmentCollection = database.collection('appointments');
      const usersCollection= database.collection('users')

      //appointments post
      app.post('/appointments', async (req, res) => {
       
        const appointment = req.body;
        const result = await appointmentCollection.insertOne(appointment)
        console.log(result);
        res.json(result);
      })

      //get appointments
      app.get('/allAppointment', async (req, res) => {
         const email = req.query.email;
         const date = new Date(req.query.date).toLocaleDateString();
        const query={email: email, date: date}
        const cursor = appointmentCollection.find(query)
        const appointments = await cursor.toArray();
        res.json(appointments);
      })

//user data post
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user)
        res.json(result)
        console.log(result);
      })

//update user api
      app.put('/users', async (req, res) => {
        const user = req.body;
        
        const filter = { email: user.email }
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);

        res.json(result);

      });

      //update admin api
      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        const requester = req.decodedEmail;
        if (requester)
        {
          const requesterAccount = await usersCollection.find({ email: requester })
          if (requesterAccount)
          {
             const filter = { email: user.email }
            const updateDoc = { $set: { Role: 'admin' } }
            const result = await usersCollection.updateOne(filter, updateDoc)
            console.log(result)
            res.json(result)    
          }
        }
        else
        {
              req.status(403).json({message:'you do not access'})
        }
        
      })

//single user
      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.Role == "admin")
        {
          isAdmin = true;
        }
        res.json({admin: isAdmin})
      })

    }
    finally
    {
        // await client.close()
    }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello doctors protal!')
})

app.listen(port, () => {
  console.log(`listening at :${port}`)
})