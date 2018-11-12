"use strict";

const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const { User, Post, Tag } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const slugify = require("slugify");
require("dotenv").config();

const userResolver = {
  Query: {
    // Fetch All Users
    async allUsers() {
      return await User.all();
    },
    // Fetch User by ID
    async fetchUser(_, { id }) {
      return await User.findById(id);
    }
  },
  Mutation: {
    // Handle User Login
    async login(_, { email, password }) {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error("User not found");
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error("Invalid password");
      }
      // Return JSON Web Token
      return jwt.sign(
        {
          id: user.id,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "1y" }
      );
    },
    // Create User
    async createUser(_, { firstName, lastName, email, password, isActive }) {
      return await User.create({
        firstName,
        lastName,
        email,
        password: await bcrypt.hash(password, 10),
        isActive
      });
    },
    // Update a User
    async updateUser(
      _,
      { id, firstName, lastName, email, password, isActive },
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
        password: await bcrypt.hash(password, 10),
        isActive
      });

      return user;
    },
    // Update User's Password
    async updateUserPassword(_, { id, password }, { authUser }) {
      // Make sure user is logged in
      if (!authUser) {
        throw new Error("You must log in to continue!");
      }

      // fetch the user by it ID
      const user = await User.findById(id);

      // Update the user
      await user.update({
        password: await bcrypt.hash(password, 10)
      });

      return user;
    },
    // Update User's Status
    async updateUserStatus(_, { id, isActive }, { authUser }) {
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
    async addPost(_, { title, content, status, tags }, { authUser }) {
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
    }
  }
};
