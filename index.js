const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const bookNowCollection = client.db("bookNowDB").collection("bookNow");

    // save service data in db
    app.post("/service", async (req, res) => {
      const addService = req.body;
      const result = await servicesCollection.insertOne(addService);
      res.send(result);
    });
    // get all services from db
    app.get("/services", async (req, res) => {
      const result = await servicesCollection.find().limit(6).toArray();
      res.send(result);
    });

    app.get("/all-jobs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {};
      if (sort) options = { sort: { deadline: sort === "asc" ? 1 : -1 } };
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      if (filter) query.category = filter;
      const result = await jobsCollection.find(query, options).toArray();
      res.send(result);
    });
    app.get("/all-jobs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {};
      if (sort) options = { sort: { deadline: sort === "asc" ? 1 : -1 } };
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      if (filter) query.category = filter;
      const result = await jobsCollection.find(query, options).toArray();
      res.send(result);
    });

    // get all services from db
    app.get("/allServices", async (req, res) => {
      const search = req.query.search;
      let option = {};
      if (search) {
        option = { title: { $regex: search, $options: "i" } };
      }

      const result = await servicesCollection.find(option).toArray();
      res.send(result);
    });
    // get single id from db
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });

    // save book now data in db
    app.post("/bookNow", async (req, res) => {
      const bookData = req.body;
      const result = await bookNowCollection.insertOne(bookData);
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
