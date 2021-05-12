//Required 
const express = require("express");
const path = require("path");

require('dotenv').config();

const { Pool } = require("pg");
const app = express();
const dblib = require("./dblib.js");

const multer = require("multer");
const upload = multer();



//Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

//Server config
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false })); // <--- middleware configuration


//Start the server
app.listen(3000, () => { {
    console.log("Server started (http://localhost:3000/) !");
  }});

// GET /
app.get("/", (request, response) => {
    // res.send("Hello world...");
    response.render("index");
  });

//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/searchcustomer", async (req, res) => {
    // Omitted validation check
    const totRecs = await dblib.getTotalRecords();
    //console.log("When searching id is:", id);

    //Create an empty customer object (To populate form with values)
    const model = {
        cusid: "",
        cusfname: "",
        cuslname: "",
        cusstate: "",
        cussalesytd: "",
        cussalesprev: ""
    };
    res.render("searchcustomer", {
        type: "get",
        totRecs: totRecs.totRecords,
        model: model
    });
});



app.post("/searchcustomer", async (req, res) => {
    const totRecs = await dblib.getTotalRecords();
    console.log("POST searchcustomer, req.body is", req.body);
    
    dblib.findcustomers(req.body)
        .then(result => {
            //console.log(result);
            console.log("Result from findcustomer is: ", result.result);
            res.render("searchcustomer", {
                type: "post",
                totRecs: totRecs.totRecords,
                model: result.result})
            })
        .catch(err => res.send({trans: "Error", result: err.message}));

});

//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

  app.get("/customers", (req, res) => {
    const sql = "SELECT * FROM customer ORDER BY cusid"
    pool.query(sql, [], (err, result) => {
      if (err) {
        return console.error(err.message);
      }
      res.render("customers", { model: result.rows });
    });
  });

//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

// GET /edit/5
app.get("/edit/:id", (req, res) => {
    const id = req.params.id;

    console.log("When editing id is:", id);
    
    const sql = "SELECT * FROM customer WHERE cusid = $1";
    pool.query(sql, [id], (err, result) => {
      // if (err) ...
      res.render("edit", { model: result.rows[0] });
    });
  });
  
  // POST /edit/5
  app.post("/edit/:id", (req, res) => {
    const id = req.params.id;
    console.log("Required Body is:", req.body);

    const customer = [req.body.cusid, req.body.cusfname, req.body.cuslname, req.body.cusstate, req.body.cussalesytd, req.body.cussalesprev, id];
    const sql = "UPDATE Customer SET Cusfname = $1, Cuslname = $2, Cusstate = $3, Cussalesytd = $4, Cussalesprev = $5 WHERE (Cusid = $6)";
    //"UPDATE Books SET Title = $1, Author = $2, Comments = $3 WHERE (Book_ID = $4)"
    pool.query(sql, customer, (err, result) => {
      // if (err) ...
      
      res.redirect("/searchcustomer");
    });
  });


//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

// GET /create

app.get("/create", (req, res) => {
    res.render("create", { model: {} });
  });


// POST /create
app.post("/create", (req, res) => {
    const sql = "INSERT INTO customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";
    const customer = [req.body.cusid, req.body.cusfname, req.body.cuslname, req.body.cusstate, req.body.cussalesytd, req.body.cussalesprev];
    pool.query(sql, customer, (err, result) => {
      // if (err) ...
      res.redirect("/searchcustomer");
    });
});


//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

// GET /delete/5
app.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    console.log("When deleting id is:", id);

    const sql = "SELECT * FROM customer WHERE cusid = $1";
    pool.query(sql, [id], (err, result) => {
    //     // if (err) ...
    res.render("delete", { model: result.rows[0] });
    });
    });
    
// POST /delete/5
app.post("/delete/:id", (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM customer WHERE cusid = $1";
    pool.query(sql, [id], (err, result) => {
    //     // if (err) ...
    res.redirect("/searchcustomer");
});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/input", (req, res) => {
    res.render("input");
 });
 
 app.post("/input",  upload.single('filename'), (req, res) => {
     if(!req.file || Object.keys(req.file).length === 0) {
         message = "Error: Import file not uploaded";
         return res.send(message);
     };
     //Read file line by line, inserting records
     const buffer = req.file.buffer; 
     const lines = buffer.toString().split(/\r?\n/);
 
     lines.forEach(line => {
          //console.log(line);
          customer = line.split(",");
          //console.log(customer);
          const sql = "INSERT INTO customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";
          pool.query(sql, customer, (err, result) => {
              if (err) {
                  console.log(`Insert Error.  Error message: ${err.message}`);
              } else {
                  console.log(`Inserted successfully`);
              }
         });
     });
     message = `Records Processed ${lines.length} records`;
     res.send(message);
 });

 
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/output", (req, res) => {
    // Omitted validation check
    //const totRecs = await dblib.getTotalRecords();

    var message = "";
    res.render("output",{ message: message });
   });
   
   
   app.post("/output", (req, res) => {
       const sql = "SELECT * FROM customer ORDER BY cusid";
       pool.query(sql, [], (err, result) => {
           var message = "";
           if(err) {
               message = `Error - ${err.message}`;
               res.render("output", { message: message })
           } else {
               var output = "";
               result.rows.forEach(customer => {
                   output += `${customer.cusid},${customer.cusfname},${customer.cuslname},${customer.cusstate},${customer.cussalesytd},${customer.cussalesprev}\r\n`;
               });
               res.header("Content-Type", "text/csv");
               res.attachment("export.csv");
               return res.send(output);
           };
       });
   });