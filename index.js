const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.llrud.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const servicesCollection = client.db("servicesDB").collection("services");

    // save service data in db
    app.post("/service", async (req, res) => {
      const addService = req.body;
      const result = await servicesCollection.insertOne(addService);
      console.log(result);
      res.send(result);
    });
    // get all services from db
    app.get("/services", async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });

    // add korrar somoi delete korte hobe
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    error.message;
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Freelancer services server is Running!");
});

app.listen(port, () => {
  console.log(`Server is Listening on port ${port}`);
});
