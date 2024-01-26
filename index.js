const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const {
  MongoClient,
  ServerApiVersion,
  ObjectId
} = require('mongodb');
require('dotenv').config();
const stripe =require('stripe')(process.env.STRIPE_SECRET_KEY)

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
    const productsCollection = client.db('assetDB').collection('product')
    const requestAssetsCollection = client.db('assetDB').collection('requestAssets')
    const adminCollection = client.db('assetDB').collection('admin')
    const paymentCollection = client.db('assetDB').collection('payments')


    //JWT   related apies
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({
        token
      })
    })

    // middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({
          message: 'unauthorized access'
        });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({
            message: 'unauthorized access'
          });
        }
        req.decoded = decoded;
        next();
      })
    }

    /// verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {
        email: email
      };
      const user = await employeesCollection.findOne(query);
      const isAdmin = user ?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({
          message: 'forbidden access'
        })
      }
      next();
    }



    // user custom request related apies
    app.get('/custom',verifyToken, async (req, res) => {
      const result = await customRequestCollection.find().toArray();
      res.send(result)
    })


    app.post('/custom', verifyToken, async (req, res) => {
      const customRequestItem = req.body;
      const today = new Date(); 
      const sortedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      customRequestItem.request_date = sortedDate;
      const result = await customRequestCollection.insertOne(customRequestItem)
      res.send(result)
    })

    app.get('/custom/:id', async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await customRequestCollection.findOne(query)
      res.send(result)
    })


    // employees related apies

    app.get('/employees/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({
          message: 'forbidden access'
        })
      }
      const query = {
        email: email
      };
      const user = await employeesCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user ?.role === 'admin';
      }
      res.send({
        admin
      })
    })


    app.get('/employees', verifyToken, async (req, res) => {
      // console.log(req.headers);
      const result = await employeesCollection.find().toArray();
      res.send(result)
    })

    app.post('/employees', async (req, res) => {
      const user = req.body;
      const query = {
        email: user.email
      }
      const existingUser = await employeesCollection.findOne(query)
      if (existingUser) {
        return res.send({
          message: 'user already exists',
          insertedId: null
        })
      }
      const result = await employeesCollection.insertOne(user)
      res.send(result)
    })

    app.delete('/employees/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await employeesCollection.deleteOne(query)
      res.send(result)
    })


    app.get('/requestAssets',verifyToken, async(req,res)=>{
      const {productName, sortBy} = req.query;
      const query = {}
      if(productName){
        query.product_name =  { $regex: new RegExp(productName, 'i') };
      }
      const sort = sortBy ? { type: sortBy === 'nonreturnable' ? 1 : -1 } : {};
      const result = await requestAssetsCollection.find(query).sort(sort).toArray();
      res.send(result)
    })

    app.post('/requestAssets',verifyToken, async(req,res)=>{
      const requestAsset = req.body;
      const today = new Date(); 
      const sortedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      requestAsset.request_date = sortedDate;
      const result = await requestAssetsCollection.insertOne(requestAsset)
      res.send(result)
    })


    // admin related apies
    app.get('/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({
          message: 'forbidden access'
        })
      }
      const query = {
        email: email
      };
      const user = await adminCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user ?.role === 'admin';
      }
      res.send({
        admin
      })
    })

    app.get('/admin', verifyToken, async (req, res) => {
      // console.log(req.headers);
      const result = await adminCollection.find().toArray();
      res.send(result)
    })

    app.post('/admin', async (req, res) => {
      const user = req.body;
      user.role= 'admin';
      const result = await adminCollection.insertOne(user)
      res.send(result)
    })

    app.patch('/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id)
      }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await adminCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })


    app.get('/products', verifyToken, async (req, res) => {
      const {productName, sortBy} = req.query;
      const query = {}
      if(productName){
        query.product_name =  { $regex: new RegExp(productName, 'i') };
      }
      const sort = sortBy ? { type: sortBy === 'nonreturnable' ? 1 : -1 } : {};
      // const sort = sortBy ? { type: sortBy === 'nonreturnable' ? { $ne: 'returnable' } : { $ne: 'nonreturnable' } } : {};
      const result = await productsCollection.find(query).sort(sort).toArray();
      const updateResult = result.map(product=>({
        ...product,
        availability:product.quantity > 0 ? 'Available' : 'Out of Stock',
      }))
      res.send(updateResult);
    })

    app.post('/products', verifyToken, verifyAdmin, async (req, res) => {
      const product = req.body;
      const today = new Date(); 
      const sortedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      product.date = sortedDate;
      const result = await productsCollection.insertOne(product);
      res.send(result)
    })

    app.patch('/employees/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id)
      }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await employeesCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })



    // admin stats

   

    // payment intent

    app.post("/create-payment-intent", async(req,res)=>{
      const { price } = req.body;
      const amount = parseInt(price*100)
      console.log('amount inside the amount intent', amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })


    app.get('/payments/:email', verifyToken,async(req,res)=>{
      const query = {email: req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
     })

     app.post('/payments', async(req,res)=>{
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment)
      res.send(result)
    })


    // reqeust-stats using aggregate
    app.get('/request-stats', async (req, res) => {
      try {
        const result = await requestAssetsCollection.aggregate([
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$count" },
              data: { $push: { type: "$_id", count: "$count" } }
            }
          },
          {
            $project: {
              _id: 0,
              total: 1,
              data: 1
            }
          }
        ]).toArray();
    
        res.json(result);
      } catch (error) {
        console.error("Error fetching request stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
    


    // Send a ping to confirm a successful connection
    await client.db("admin").command({
      ping: 1
    });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('asset management Server running')
})

app.listen(port, () => {
  console.log(`asset management server running on${port}`);
})