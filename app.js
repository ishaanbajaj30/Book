const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "Mysecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/bookDB", { useNewUrlParser: true });

const bookSchema = new mongoose.Schema({
  name: String,
  count: Number,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  book: [bookSchema],
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Book = new mongoose.model("Book", bookSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// app.get("/", function (req, res) {
//   res.sendFile(__dirname + "/index.html");
// });
let chunks = [];
let bookname = [];

app.get("/", function (req, res) {
  res.render("h");
});

app.get("/home", function (req, res) {
  res.render("home", { po: bookname });
});

app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/addbook", function (req, res) {
  res.render("addbook");
});
app.get("/inventory", function (req, res) {
  console.log(req.user.book[0].name);
  // User.findById(req.user.id, function (err, foundUser) {
  //   if (err) {
  //     console.log(req.user.id);
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       for (i = 0; i < req.user.book.length; i++) {
  //         storebook.push(req.user.book[i].name);
  //       }
  //       res.redirect()
  //     }
  //   }
  // });

  res.render("inventory", { storebook: req.user.book });
});

app.get("/:book", function (req, res) {
  // console.log(req.params.book);
  // console.log(req.user.id);
  res.render("content", { bookname: req.params.book });
});

app.post("/inventory", function (req, res) {
  let del = req.body.delbook.toString();

  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(req.user.id);
      console.log(err);
    } else {
      if (foundUser) {
        for (i = 0; i < foundUser.book.length; i++) {
          let del2 = foundUser.book[i]._id.toString();
          console.log(del);
          console.log(del2);
          if (del === del2) {
            console.log("Hello");
            foundUser.book[i].count = foundUser.book[i].count - 1;
          }
        }
        foundUser.save(function () {
          res.redirect("/inventory");
        });
      }
    }
  });
});

app.post("/addbook", function (req, res) {
  console.log(req.body.bookname);
  const url =
    "https://www.googleapis.com/books/v1/volumes?q=" +
    req.body.bookname +
    "&key=AIzaSyAJ35b2N5D3xSWGrnBYsfqUXpSH-DjCJKY";
  https.get(url, function (response) {
    response
      .on("data", function (data) {
        chunks.push(data);
      })
      .on("end", function () {
        let data = Buffer.concat(chunks);
        let schema = JSON.parse(data);
        for (i = 0; i < schema.items.length; i++) {
          bookname.push(schema.items[i].volumeInfo.title);
        }
      });
  });
  res.redirect("/home");
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/addbook");
      });
    }
  });
});

app.post("/register", function (req, res) {
  console.log(req.body.username);
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/addbook");
        });
      }
    }
  );
});

app.post("/:book", function (req, res) {
  const newbook = new Book({
    name: req.params.book,
    count: req.body.count,
  });
  // console.log(req.params.book);
  console.log(req.user.id);
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(req.user.id);
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.book.push(newbook);
        foundUser.save(function () {
          res.redirect("/");
        });
      }
    }
  });
});

app.listen(3000, function () {
  console.log("3000 working");
});
