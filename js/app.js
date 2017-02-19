var app = angular.module('app', []);

var bannerImg = document.getElementById('bannerImg');
var img = document.getElementById('tableBanner');
var addContact = document.getElementById('submitContact');
var formPanel = document.getElementById('formContainer');
var previewDIV = document.getElementById('previewContainer');
var avatarUrl = "";
var localList = [];
var allContacts = [];

bannerImg.addEventListener('change', handleFileUpload, false);
addContact.addEventListener('submit', handleAddContact, false);


window.onload = function() { initLocalData() };

function initLocalData() {
  const keys = Object.keys(localStorage);
  var i = keys.length;

  //upload contacts stored locally
  while (i--) {
     var profilePic = null;
     if (keys[i] !== "deleted") {
       localList.unshift(JSON.parse(localStorage.getItem(keys[i])));
     }
  }
}

function handleAddContact(evt) {
  if(!avatarUrl) { return false ;}
  var newContact = {

    //give them a random id that does not conflict with ids provide by external API
    "id": Math.floor(Math.random() * (999999 - 13)) + 13,
    "first_name": addContact.firstName.value,
    "last_name": addContact.lastName.value,
    "address" : addContact.Address.value +", "+ addContact.City.value +", "+ addContact.State.value +" "+ addContact.Zip.value,
    "phone": addContact.Phone.value.replace(/\D/g,''),
    "occupation": addContact.Occupation.value,
    "avatar": avatarUrl
  }

  localStorage.setItem(newContact.id, JSON.stringify(newContact));
  localList.unshift(newContact);
  updateController(newContact);
  addContact.reset();
}

function updateController(newContact) {
  var appElement = document.querySelector('[ng-app=app]');
  var $scope = angular.element(appElement).scope();
  $scope = $scope.$$childHead;
  $scope.$apply(function() {
      $scope.people.unshift(newContact);
  });
  allContacts.unshift(newContact);
}

function handleFileUpload(evt) {
  var files = evt.target.files; // FileList object

  for (var i = 0, f; f = files[i]; i++) {

     // Only process image files.
     if (!f.type.match('image.*') || f.type.match('image/gif')) {
        previewDIV.innerHTML = "<span>Invalid file type</span>"
        avatarUrl = "";
     }
     else {
       var reader = new FileReader();
       reader.onload = (function(theFile) {
         return function(e) {
           avatarUrl = e.target.result;
           previewDIV.innerHTML = "<img src='" + avatarUrl + "'/>"
         };
       })(f);
       // Read in the image file as a data URL.
       reader.readAsDataURL(f);
     }
   }
 }

app.controller('repoCtrl', function($scope, $http) {

  //track items we removed to keep them from being loaded by external API
  var DeletedList = JSON.parse(localStorage.getItem('deleted')) || [];
  var mainURL = "https://reqres-api.herokuapp.com/api/users/";
  $scope.searchText = "";

  $http.get(mainURL)
    .then(function successAll(response) {
      var filteredData = response.data.filter(function (obj) { return DeletedList.indexOf(obj.id) < 0;});
      allContacts = localList.concat(filteredData);

      //capitalize first letter of names being passed to $scope.people
      allContacts.forEach(function(person) {
        person.first_name = $scope.Capitalize(person.first_name);
        person.last_name = $scope.Capitalize(person.last_name);
      });
      $scope.getFilteredContactList();

    }, function errorAll(response) {
      console.log(response.statusText);
  });

  $scope.getFilteredContactList = function(){
    var searchInput = $scope.searchText.trim().toLowerCase();

    // If nothing is the search bar, we want to return all of the contacts
    if (!searchInput) { $scope.people = allContacts ;}

    // This filter will return a new array of contacts. If searchInput has
    // an index value in a contact inside allContacts, it will pass through.
    $scope.people = allContacts.filter(contact => {
      return (contact.first_name.toLowerCase().search(searchInput) >= 0 ||
             contact.last_name.toLowerCase().search(searchInput) >= 0);
    });
  }


  $scope.ViewAllInfo = function(personID) {
    //if the data is from external API, it will have an "id" value less than 13.
    if (personID < 13) {
      $http.get(mainURL + personID)
        .then(function successOne(response){
          $scope.ScrubData(response.data);

        }, function clickError(response) {
          console.log(response.statusText);
      });
   }
   else {
     //if data is stored locally, find obj in our local listing
     var localObj = localList.filter(function (obj) { return obj.id === personID;})[0];
     $scope.ScrubData(localObj);
   }
  }

  $scope.ScrubData = function(details) {

    // convert 11 digit numberical value to phone number syntax
    var rawPhoneNum = String(details.phone);

    if(rawPhoneNum.length > 10) { rawPhoneNum = rawPhoneNum.slice(rawPhoneNum.length - 10);}

    details.phoneNum = rawPhoneNum.substring(0,3) + "-" +
                       rawPhoneNum.substring(3,6) + "-" + rawPhoneNum.substring(6);

    //capitalize first letter in JSON being passed through
    details.first_name = $scope.Capitalize(details.first_name);
    details.last_name = $scope.Capitalize(details.last_name);
    details.occupation = $scope.Capitalize(details.occupation);

    //remove placeholder text in details DOM element and display API information
    document.getElementById('detailsView').style.display = 'block';
    var detailsInstr = document.getElementById('detailsInstr');
    if(detailsInstr){ detailsInstr.parentNode.removeChild(detailsInstr)};

    $scope.details = details;
  }

  $scope.Capitalize = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  $scope.RemoveInfo = function(personIndex, personID) {
    var voidContact = $scope.people[personIndex];

    //if locally stored, remove from list
    if(localStorage[personID]) { localStorage.removeItem(personID); }

    //if store externally, block obj from being passed to scope.
    DeletedList.unshift(voidContact.id);
    localStorage.setItem('deleted', JSON.stringify(DeletedList));
    $scope.people.splice(personIndex, 1);
    allContacts.splice(personIndex, 1);
  }
});
