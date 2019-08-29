var express = require('express');
var db = require('../db');
var router = express.Router();

/* GET users listing. */
router.get('/new', function(req, res, next) {
  res.render('register');
});

router.post('/', function(req, res, next) {
  console.log('REGISTER!');
  console.log(req.headers);
  console.log(req.body);
  
  var user = {
    displayName: req.body.name,
    username: req.body.username
  };
  
  // FIXME: rename to users
  // use post to auto-assign an _id
  db.post(user, function callback(err, result) {
    console.log(err);
    console.log(result);
    
    if (err) { return next(err); }
    
    var opts = {
      challenge: '1234', // TODO: Make this random,
      rp: {
          name: "ACME Corporation"
      },
      user: {
        id: result.id,
        name: user.username,
        displayName: user.displayName
      },
      pubKeyCredParams: [
        {
          type: "public-key", alg: -7 // "ES256" IANA COSE Algorithms registry
        }
      ]
    }
    
    res.json(opts);
  });
});



var USER_PRESENT = 0x01;
var ATTESTED_CREDENTIAL_INCLUDED = 0x40;
var EXTENSTION_DATA_INCLUDED = 0x80;

function parseMakeCredAuthData(buffer) {
  var i = 0;
  var rpIdHash = buffer.slice(i, i += 32);
  var flags = buffer.slice(i, i += 1);
  var signCount = buffer.slice(i, i += 4);
  
  console.log(flags)
  
  flags = flags[0]
  
  var authData = {
    rpIdHash: rpIdHash,
    flags: flags,
    signCount: signCount.readUInt32BE(0)
  };
  
  
  if (flags & USER_PRESENT) {
    console.log('USER PRESENT!')
  }
  
  if (flags & ATTESTED_CREDENTIAL_INCLUDED) {
    var aaguid = buffer.slice(i, i += 16);
    var credentialIdLength = buffer.slice(i, i += 2);
    credentialIdLength = credentialIdLength.readUInt16BE(0);
    
    console.log('CRED DATA INCLUDED!');
    console.log(credentialIdLength)
    
    var credentialId = buffer.slice(i, i += credentialIdLength);
    console.log(credentialId);
    console.log(base64url.encode(credentialId));
    
    // TODO: Determine lenght of this, so that extensions can be parsed, if included.
    var credentialPublicKey = buffer.slice(i);
    console.log(credentialPublicKey);
    
    authData.aaguid = aaguid;
    authData.credentialId = credentialId;
    authData.credentialPublicKey = credentialPublicKey;
  }
  
  return authData;
  
  
  /*
    let rpIdHash      = buffer.slice(0, 32);          buffer = buffer.slice(32);
    let flagsBuf      = buffer.slice(0, 1);           buffer = buffer.slice(1);
    let flags         = flagsBuf[0];
    let counterBuf    = buffer.slice(0, 4);           buffer = buffer.slice(4);
    let counter       = counterBuf.readUInt32BE(0);
    let aaguid        = buffer.slice(0, 16);          buffer = buffer.slice(16);
    let credIDLenBuf  = buffer.slice(0, 2);           buffer = buffer.slice(2);
    let credIDLen     = credIDLenBuf.readUInt16BE(0);
    let credID        = buffer.slice(0, credIDLen);   buffer = buffer.slice(credIDLen);
    let COSEPublicKey = buffer;

    return {rpIdHash, flagsBuf, flags, counter, counterBuf, aaguid, credID, COSEPublicKey}
  */
}

function saveToDB(body) {
  console.log('save to DB!');
  console.log(body);
  
  var response = body.response;
  var clientData = JSON.parse(base64url.decode(response.clientDataJSON));
  console.log(clientData);
  
  var attestationObject = cbor.decodeFirstSync(base64url.toBuffer(response.attestationObject));
  console.log(attestationObject);
  
  let authrDataStruct = parseMakeCredAuthData(attestationObject.authData);
  console.log(authrDataStruct)
  
  
  var pk = cbor.decodeAllSync(authrDataStruct.credentialPublicKey);
  console.log(pk);
  
  var jwk = cose2jwk(authrDataStruct.credentialPublicKey);
  console.log(jwk);
  
  var pem = jwk2pem(jwk);
  console.log(pem);
  
  
  var authnr = {
    externalID: body.id,
    publicKey: pem,
    userID: '1'
  };
  
  
  switch (attestationObject.fmt) {
  case 'none':
    console.log('NONE!');
    break;
  }
  
  
  
  
  console.log(authnr)
  
  db.post(authnr, function callback(err, result) {
    console.log(err);
    console.log(result);
    
    /*
{ externalID:
   'jWcLBKE7CnLmJTecFZNTSFnWyaokRzpu3cg-b1qMBweUpCHMPhZ9MVL4oVFI3Vb4_K-d4wJoxfjjZ4uU17xNQA',
  publicKey:
   '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYk0IJlg+EpjWmsSkV0K3/KdeJRI6\n2ABcPAflwTwqXXzTLDj9Sq6PR0pZR3n1ydJHIFSbozFTfLGbl44naii6LQ==\n-----END PUBLIC KEY-----\n',
  userID: '1' }
    */
    
    /*
{ ok: true,
  id: '9cf03ba5-0c04-43e7-a921-ed9fd52e2dcd',
  rev: '1-ea801a943c930ee5caf3cc04f8e6117f' }
    */
    
  });
}

/*
saveToDB({ rawId:
   'jWcLBKE7CnLmJTecFZNTSFnWyaokRzpu3cg-b1qMBweUpCHMPhZ9MVL4oVFI3Vb4_K-d4wJoxfjjZ4uU17xNQA',
  response:
   { attestationObject:
      'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVjESZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2NBAAAAAAAAAAAAAAAAAAAAAAAAAAAAQI1nCwShOwpy5iU3nBWTU0hZ1smqJEc6bt3IPm9ajAcHlKQhzD4WfTFS-KFRSN1W-PyvneMCaMX442eLlNe8TUClAQIDJiABIVggYk0IJlg-EpjWmsSkV0K3_KdeJRI62ABcPAflwTwqXXwiWCDTLDj9Sq6PR0pZR3n1ydJHIFSbozFTfLGbl44naii6LQ',
     getTransports: {},
     clientDataJSON:
      'eyJjaGFsbGVuZ2UiOiJNVEl6TkEiLCJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0' },
  getClientExtensionResults: {},
  id:
   'jWcLBKE7CnLmJTecFZNTSFnWyaokRzpu3cg-b1qMBweUpCHMPhZ9MVL4oVFI3Vb4_K-d4wJoxfjjZ4uU17xNQA',
  type: 'public-key' })
*/



router.post('/credentials', function(req, res, next) {
  console.log('CREDENTIAL!');
  console.log(req.headers);
  console.log(req.body);
  
  
});


module.exports = router;
