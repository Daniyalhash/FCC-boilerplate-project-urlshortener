require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const urlParser = require('url');

const app = express();

// ====== Basic Configuration ======
const port = process.env.PORT || 3000;
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));

// ====== MongoDB Connection ======
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ====== Mongoose Schema ======
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

// ====== Routes ======
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// POST: Create short URL
app.post('/api/shorturl', (req, res) => {
  let originalUrl = req.body.url;
  let hostname;

  try {
    hostname = new URL(originalUrl).hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, (err) => {
    if (err) return res.json({ error: 'invalid url' });

    Url.findOne({ original_url: originalUrl })
      .then(doc => {
        if (doc) {
          return res.json({
            original_url: doc.original_url,
            short_url: doc.short_url
          });
        } else {
          Url.estimatedDocumentCount()
            .then(count => {
              let shortId = count + 1;
              let newUrl = new Url({
                original_url: originalUrl,
                short_url: shortId
              });
              newUrl.save()
                .then(saved => {
                  res.json({
                    original_url: saved.original_url,
                    short_url: saved.short_url
                  });
                });
            });
        }
      });
  });
});

// GET: Redirect short URL
app.get('/api/shorturl/:short_url', (req, res) => {
  let short = parseInt(req.params.short_url);
  Url.findOne({ short_url: short })
    .then(doc => {
      if (!doc) return res.json({ error: 'No short URL found' });
      res.redirect(doc.original_url);
    })
    .catch(err => res.json({ error: 'No short URL found' }));
});

// ====== Start Server ======
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
