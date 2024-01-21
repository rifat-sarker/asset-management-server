const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.l80xyen.mongodb.net/?retryWrites=true&w=majority`;



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const customRequestCollection = client.db('assetDB').collection('customRequest')
    const employeesCollection = client.db('assetDB').collection('employee')

    // user custom request related apies
    app.get('/custom', async(req,res)=>{
      const result = await customRequestCollection.find().toArray();
      res.send(result)
    })


    app.post('/custom', async(req,res)=>{
      const customRequestItem = req.body;
      const result = await customRequestCollection.insertOne(customRequestItem)
      res.send(result)
    })

    app.get('/custom/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await customRequestCollection.findOne(query)
      res.send(result)
    })


  // employees related apies
  app.get('/employees', async(req,res)=>{
    const result = await employeesCollection.find().toArray();
    res.send(result)
  })

  app.post('/employees', async(req,res)=>{
    const user = req.body;
    const result = await employeesCollection.insertOne(user)
    res.send(result)
  })

  app.delete('/employeess')






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('asset management Server running')
})

app.listen(port ,()=>{
    console.log(`asset management server running on${port}`);
})