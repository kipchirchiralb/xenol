const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false })); // body-parser
app.use(express.static("public"));
app.use(express.json());
app.use(
  session({
    secret: "secret word",
    resave: false,
    saveUninitialized: false,
  })
);
// custom session middleware
app.use((req, res, next) => {
  if (req.session.email) {
    res.locals.isLoggedIn = true;
  } else {
    res.locals.isLoggedIn = false;
  }
  next();
});

const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "xenol",
});
connection.connect((err) => {
  err ? console.error(err) : console.log("DB successfuly connected"); // ternary operators
});

// custom middleware function
function logTimestamp(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
}
// app.use(logTimestamp);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about");
});
app.get("/products", (req, res) => {
  connection.query("SELECT * FROM products", (error, results) => {
    // console.log(results);
    res.render("products", { products: results });
  });
});

app.get("/product", (req, res) => {
  res.render("product");
});
app.post("/product", (req, res) => {
  connection.query(
    "INSERT INTO products(product_id, product_name,price) VALUES(?,?,?)",
    [req.body.id, req.body.name, req.body.price],
    (error) => {
      if (error) {
        console.log(error);
        res.status(500).render("error");
      } else {
        // get all products to the products page
        connection.query("SELECT * FROM products", (error, results) => {
          // console.log(results);
          res.render("products", { products: results });
        });
      }
    }
  );
});

app.post("/product/:id", (req, res) => {
  // delete a product with id in params
  console.log(req.params.id);
  connection.query(
    "DELETE FROM products WHERE product_id = ?",
    [req.params.id],
    (error) => {
      if (error) {
        res.render("error");
      } else {
        res.redirect("/products");
      }
    }
  );
});

app.get("/products-api", (req, res) => {
  connection.query("SELECT * FROM products", (error, results) => {
    res.json(results);
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    res.redirect("/");
  });
});

app.post("/login", (req, res) => {
  // console.log(req.body);
  // check if email exists in db
  // if it does exist, compare the provided with the existing password
  // if password is correct , then create a session for them
  connection.query(
    "SELECT email, password FROM companies WHERE email = ?",
    [req.body.email],
    (error, results) => {
      if (error) {
        res.status(500).render("error");
      } else {
        if (results.length > 0) {
          // compare passwords
          bcrypt.compare(
            req.body.password,
            results[0].password,
            function (err, result) {
              if (result) {
                // succesful login
                req.session.email = results[0].email;
                res.redirect("/");
              } else {
                res.render("login", { error: "Password is incorrect" });
              }
            }
          );
        } else {
          res.render("login", {
            error: "Email not registered / not recognised!",
          });
        }
      }
    }
  );
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.post("/register", (req, res) => {
  // console.log(req.body);
  const user = req.body;
  if (user.password === user.confirm_password) {
    // check if email already exists
    connection.query(
      "SELECT email FROM companies WHERE email= ?",
      [user.email],
      (error, results) => {
        if (error) {
          console.log(error);
          res.status(500).render("error");
        } else {
          // check the length of results(if greater than zero the email already exists in db else continue to register/save data to db)
          if (results.length > 0) {
            res.render("register", {
              error: true,
              emailError: "Email is already registered!",
              data: req.body,
            });
          } else {
            // enrypt password
            bcrypt.hash(req.body.password, 6, function (err, hash) {
              // Store hash in your password DB.
              //continie to save data in db
              connection.query(
                "INSERT INTO companies(company_name,email,password,domain_name,num_of_employees,description,service) VALUES(?,?,?,?,?,?,?)",
                [
                  user.company,
                  user.email,
                  hash,
                  user.domain,
                  user.num_of_employess,
                  user.description,
                  "general-3",
                ],
                (error) => {
                  error
                    ? res.status(500).render("error")
                    : res.redirect("/login");
                }
              );
            });
          }
        }
      }
    );
  } else {
    // rerender register with an error message
    res.render("register", {
      error: true,
      passwordError: "Password and Confirm Password do not match",
      data: req.body,
    });
  }
});

app.listen(3000, () => {
  console.log("listening on port 3000");
});
