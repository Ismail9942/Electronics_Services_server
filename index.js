const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Middleware setup
const corsOptions = {
  origin: ["https://freelancer-services-18d2f.web.app"],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// MongoDB setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.llrud.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Improved token verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const servicesCollection = client.db("servicesDB").collection("services");
    const bookNowCollection = client.db("bookNowDB").collection("bookNow");

    // JWT Authentication Endpoints
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 2 * 60 * 60 * 1000, // 2 hours
        })
        .send({ success: true });
    });

    // clear cookie browser
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Services Endpoints
    app.post("/service", async (req, res) => {
      try {
        const service = req.body;
        const result = await servicesCollection.insertOne(service);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add service" });
      }
    });

    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().limit(6).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch services" });
      }
    });

    // get all data in db

    app.get("/allServices", async (req, res) => {
      try {
        const search = req.query.search || "";
        let query = {};

        if (search.trim()) {
          query = {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
              { category: { $regex: search, $options: "i" } },
            ],
          };
        }

        const services = await servicesCollection.find(query).toArray();

        if (services.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No services found matching your search",
          });
        }

        res.status(200).json(services);
      } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch services",
          error: error.message,
        });
      }
    });

    // get single service id db
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });

    // get data updated
    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const updated = { $set: updateData };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await servicesCollection.updateOne(
        query,
        updated,
        options
      );

      res.send(result);
    });

    // delete db
    app.delete("/service-delete/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    // get all services posted by specific user
    app.get("/my-services", verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email;
      const email = req.query.email;

      if (decodedEmail !== email)
        return res.status(401).send({ message: "unauthorized access" });

      const query = { "provider.email": email };

      const result = await servicesCollection.find(query).toArray();
      res.send(result);
    });

    // save to book now collection db

    app.post("/bookNow", async (req, res) => {
      try {
        const booking = req.body;
        const query = {
          email: booking.userEmail,
          serviceId: booking.serviceId,
        };

        const allreadyExist = await bookNowCollection.findOne(query);
        if (allreadyExist) {
          return res
            .status(400)
            .send("you have already placed a bid on this service!");
        }

        const result = await bookNowCollection.insertOne(booking);

        const filter = { _id: new ObjectId(booking.serviceId) };
        const update = {
          $inc: { bid_count: 1 },
        };

        await servicesCollection(filter, update);

        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to create booking" });
      }
    });

    // status update in db

    app.patch("/status-update/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updated = {
        $set: { status },
      };
      const result = await bookNowCollection.updateOne(filter, updated);
      res.send(result);
    });

    app.get("/myBook", async (req, res) => {
      try {
        const email = req.query.email;
        const query = { userEmail: email };
        const result = await bookNowCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching bookNow:", error);
        res.status(500).send({ message: "Failed to fetch bookNow" });
      }
    });

    app.get("/myBook", async (req, res) => {
      try {
        const email = req.query.email;

        const query = { userEmail: email };
        const result = await bookNowCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching bookNow:", error);
        res.status(500).send({ message: "Failed to fetch bookNow" });
      }
    });

    // get specific email in db

    app.get("/bookNow/:email", verifyToken, async (req, res) => {
      try {
        const provider = req.query.provider;
        const email = req.params.email;
        const decodedEmail = req.user?.email;

        if (!decodedEmail || decodedEmail !== email) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        let query = {};
        if (provider) {
          query.provider = email;
        } else {
          query.email = email;
        }
        const result = await bookNowCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching user bookNow:", error);
        res.status(500).send({ message: "Failed to fetch bookNow" });
      }
    });

    //   // Start the server
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Basic route
app.get("/", (req, res) => {
  res.send("Freelancer Services Server is Running!");
});
// process.on("unhandledRejection", (err) => {
//   console.error(`Unhandled Rejection: ${err}`);
//   process.exit(1);
// });
