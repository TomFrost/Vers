#Vers

var vers = new Vers(function(obj) {
  return obj.get('version');
});

vers.translate(1, 2, function(obj) {
  var parts = obj.split('@');
  obj.host = parts[0];
  obj.domain = parts[1];
  delete obj.email;
  return obj;
}, function(obj) {
  obj.email = obj.host + '@' + obj.domain;
  delete obj.host;
  delete obj.domain;
  return obj;
});

var myObj = {
  version: 1,
  firstName: 'Stephen',
  lastName: 'Vaughn',
  email: 'stephen@vaughn.com'
};

vers.to(2, myObj);
vers.toLatest(myObj);
