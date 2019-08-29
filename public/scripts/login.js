function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

function publicKeyCredentialToJSON(cred) {
  if (cred instanceof Array) {
      var arr = [];
      for(var i of cred)
          arr.push(publicKeyCredentialToJSON(i));

      return arr
  }

  if (cred instanceof ArrayBuffer) {
    return base64url.encode(cred)
      //return _arrayBufferToBase64(cred)
  }

  if (cred instanceof Object) {
      let obj = {};

      for (var key in cred) {
          obj[key] = publicKeyCredentialToJSON(cred[key])
      }

      return obj
  }

  return cred
}


window.onload = function() {
  document.getElementById('login').addEventListener('click', function(e) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/webauthn/request', true);
    xhr.onreadystatechange = function() {
    
      if (this.readyState === XMLHttpRequest.DONE) {
        console.log(this.responseText)
        
        var json = JSON.parse(this.responseText);
        
        var enc = new TextEncoder(); // always utf-8
        json.challenge = enc.encode(json.challenge); // encode to ArrayBuffer
        //json.allowCredentials[0].id = enc.encode(json.allowCredentials[0].id); // encode to ArrayBuffer
        json.allowCredentials[0].id = base64url.decode(json.allowCredentials[0].id);
        
        //console.log(json);
        
        navigator.credentials.get({ publicKey: json })
          .then(function(response) {
            console.log(response)
          
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/webauthn/response', true);
            xhr.onreadystatechange = function() {
              console.log(this.readyState);
              console.log(this.status);
              console.log(this.responseText)
              
              if (this.readyState === XMLHttpRequest.DONE) {
                window.location = '/';
              }
            };
            
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(publicKeyCredentialToJSON(response)));
          })
          .catch(function(err) {
            console.log(err);
            console.log(err.code);
            console.log(err.message);
          });
      }
    };
    
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      foo: 'bar',
      username: document.getElementById('username').value
    }));
    
    e.preventDefault();
  });
};
