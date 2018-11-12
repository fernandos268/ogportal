"use strict";

const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const { User, Post, Tag } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const slugify = require("slugify");

const models = require("../models");

const { tryLogin } = require("../auth");
const formatErrors = require("../formatErrors");

require("dotenv").config();
// Defining the resolvers

const resolvers = {
  Query: {
    // Fetch All Users
    async allUsers() {
      return await User.all();
    },
    // Fetch User by ID
    async fetchUser(parent, { id }) {
      return await User.findById(id);
    },
    async getProfile(parent, { email }, { user }) {
      if (user) {
        //user is logged in
        return User.findOne({
          where: {
            id: user.id
          }
        });
      }
      return null;
    },
    // Fetch All Posts
    async allPosts(parent, args, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      return await Post.all();
    },
    // Fetch Post by ID
    async fetchPost(parent, { id }) {
      return await Post.findById(id);
    },
    // Fetch All Tags
    async allTags(parent, args, { user }) {
      return await Tag.all();
    },
    // Fetch Tag by ID
    async fetchTag(parent, { id }) {
      return await Tag.findById(id);
    }
  },
  Mutation: {
    // Handle User Login

    // async login(parent, { email, password, rememberMe }) {
    //   // check if user exist
    //   const user = await User.findOne({ where: { email } });
    //   if (!user) {
    //     return {
    //       ok: false,
    //       errors: [{ path: "email", message: "Wrong email" }]
    //     };
    //   }

    //   // check if password is correct
    //   const valid = await bcrypt.compare(password, user.password);
    //   if (!valid) {
    //     return {
    //       ok: false,
    //       errors: [{ path: "password", message: "Wrong password" }]
    //     };
    //   }

    //   const token = jwt.sign(
    //     {
    // id: user.id,
    // role: user.role,
    // rememberMe: user.rememberMe,
    // isLoggedIn: true
    //     },
    //     process.env.JWT_SECRET,
    //     { expiresIn: "12h" }
    //   );

    //   return token;
    // },

    login: (parent, { email, password, rememberMe }) =>
      tryLogin(email, password, rememberMe, User),

    // Create User
    // async createUser(
    //   parent,
    //   { firstName, lastName, email, username, password, role, isActive }
    // ) {
    //   return await User.create({
    //     firstName,
    //     lastName,
    //     email,
    //     username,
    //     password: await bcrypt.hash(password, 12),
    //     role,
    //     isActive
    //   });
    // },

    async createUser(
      parent,
      { firstName, lastName, email, username, password, role, isActive }
    ) {
      try {
        const user = await User.create({
          firstName,
          lastName,
          email,
          username,
          password: await bcrypt.hash(password, 12),
          role,
          isActive
        });

        return {
          ok: true,
          user
        };
      } catch (err) {
        console.log(err);
        return {
          ok: false,
          errors: formatErrors(err, models)
        };
      }
    },

    // Update a User
    async updateUser(
      parent,
      { id, firstName, lastName, email, username, isActive },
      { authUser }
    ) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }

      // fetch the user by it ID
      const user = await User.findById(id);

      // Update the user
      await user.update({
        firstName,
        lastName,
        email,
        username,
        isActive
      });

      return user;
    },
    // Update User's Password
    async updateUserPassword(parent, { id, password }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }

      // fetch the user by it ID
      const user = await User.findById(id);

      // Update the user
      await user.update({
        password: await bcrypt.hash(password, 12)
      });

      return user;
    },
    // Update User's Status
    async updateUserStatus(parent, { id, isActive }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }

      // fetch the user by it ID
      const user = await User.findById(id);

      // Update the user
      await user.update({
        isActive
      });

      return user;
    },
    // Add a new post
    async addPost(parent, { title, content, status, tags }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      const user = await User.findOne({ where: { id: authUser.id } });
      const post = await Post.create({
        userId: user.id,
        title,
        slug: slugify(title, { lower: true }),
        content,
        status
      });
      // Assign tags to post
      await post.setTags(tags);
      return post;
    },
    // Update a particular post
    async updatePost(
      parent,
      { id, title, content, status, tags },
      { authUser }
    ) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      // fetch the post by it ID
      const post = await Post.findById(id);
      // Update the post
      await post.update({
        title,
        slug: slugify(title, { lower: true }),
        content,
        status
      });
      // Assign tags to post
      await post.setTags(tags);
      return post;
    },
    // Delete a specified post
    async deletePost(parent, { id }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      // fetch the post by it ID
      const post = await Post.findById(id);
      return await post.destroy();
    },
    // Add a new tag
    async addTag(parent, { name, description }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      return await Tag.create({
        name,
        slug: slugify(name, { lower: true }),
        description
      });
    },
    // Update a particular tag
    async updateTag(parent, { id, name, description }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      // fetch the tag by it ID
      const tag = await Tag.findById(id);
      // Update the tag
      await tag.update({
        name,
        slug: slugify(name, { lower: true }),
        description
      });
      return tag;
    },
    // Delete a specified tag
    async deleteTag(parent, { id }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }
      // fetch the tag by it ID
      const tag = await Tag.findById(id);
      return await tag.destroy();
    }
  },
  User: {
    // Fetch all posts created by a user
    async posts(user) {
      return await user.getPosts();
    }
  },
  Post: {
    // Fetch the author of a particular post
    async user(post) {
      return await post.getUser();
    },
    // Fetch alls tags that a post belongs to
    async tags(post) {
      return await post.getTags();
    }
  },
  Tag: {
    // Fetch all posts belonging to a tag
    async posts(tag) {
      return await tag.getPosts();
    }
  },
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    description: "DateTime type",
    parseValue(value) {
      // value from the client
      return new Date(value);
    },
    serialize(value) {
      const date = new Date(value);
      // value sent to the client
      return date.toISOString();
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        // ast value is always in string format
        return parseInt(ast.value, 10);
      }
      return null;
    }
  })
};

module.exports = resolvers;
