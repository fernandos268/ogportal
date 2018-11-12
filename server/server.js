const express = require("express");
const cors = require("cors");
const jwt = require("express-jwt");
const { ApolloServer } = require("apollo-server-express");
const { typeDefs, resolvers } = require("./data/schema");

require("dotenv").config();

const port = process.env.PORT || 3080;

const path = "/graphql";

const app = express();

// const addUser = async (req, res) => {
//   const token = req.headers.authorization;
//   try {
//     const { user } = await jwt.verify(token, process.env.JWT_SECRET);
//     req.user = user;
//   } catch (err) {
//     console.log(err);
//   }
//   req.next();
// };

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    authUser: req.user
  })
});

app.use(cors({ origin: "http://localhost:3001" }));

// app.use(path, addUser);

//Mount a jwt or other authentication middleware that is run before the GraphQL execution
app.use(
  path,
  jwt({
    secret: process.env.JWT_SECRET,
    credentialsRequired: false,
    getToken: function fromHeaderOrQuerystring(req) {
      if (
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
      ) {
        return req.headers.authorization.split(" ")[1];
      } else if (req.query && req.query.token) {
        return req.query.token;
      }
      return null;
    }
  })
);

// app.use(
//   path,
//   jwt({
//     secret: process.env.JWT_SECRET,
//     credentialsRequired: false
//   })
// );

server.applyMiddleware({ app });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}${path}`);
});
