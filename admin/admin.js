(function () {
	
	var app = angular.module('movieApp');

	app.controller('mainCtr', function($scope, $firebaseObject, $timeout, $filter, storageService, DatabaseService, AdminService, $interval){
		window.sc = $scope;
		window.interval = $interval;
		sc.user = {};
		sc.isUsersLoaded = false;

		var ref = firebase.database().ref().child("user");
		var userObject = $firebaseObject(ref);

		userObject.$bindTo($scope, "user");

		userObject.$loaded().then(function () {
			console.log("Load done");
			console.log(userObject);
			sc.isUsersLoaded = true;
			sc.refreshList();
		});

		firebase.auth().onAuthStateChanged(function(user) {
			if (user) {
				console.log(user);
				sc.admin = user;
			} else {
				console.log("Sign out!");
				AdminService.checkUser();
				
			}
		});

		sc.coverArray = function () {
			return Object.keys(userObject).map(function (key) {return userObject[key]});
		}

		sc.refreshList = function () {
			sc.userList = sc.coverArray();
			sc.$evalAsync();
		}

		ref.on("value", function (snapshot) {
			console.log("Data changed!");
			$timeout(function() {
				sc.refreshList();
				console.log('update with timeout fired')
			}, 100);
		})

		sc.search = {};

		$scope.getMyCtrlScope = function() {
			return $scope;   
		}

		sc.SelectedUser = [];

		sc.Check = function (user, value) {
			if (value === true)
				sc.SelectedUser.push(user);
			else
				sc.removeUserFromList(user, sc.SelectedUser);
		}

		sc.removeUserFromList = function (user, List) {
			var index = List.indexOf(user);
			if (index != -1) 
				List.splice(index, 1);
		}


		// sc.Action = {};

		sc.doAction = function () {
			if (sc.Action != undefined)
				sc.Action();
		}

		sc.changeToUser = function () {
			sc.changeTo('USER');
		}

		sc.changeToAdmin = function () {
			sc.changeTo('ADMIN');
		}

		sc.blockUser = function () {
			for (var i = sc.SelectedUser.length - 1; i >= 0; i--) {
				sc.changeStatus(sc.SelectedUser[i], "BLOCKED")
			}
			sc.SelectedUser = [];
			sc.$evalAsync();
		}

		sc.unblockUser = function () {
			for (var i = sc.SelectedUser.length - 1; i >= 0; i--) {
				sc.changeStatus(sc.SelectedUser[i], "ACTIVE")
			}
			sc.SelectedUser = [];
			sc.$evalAsync();
		}


		sc.changeTo = function (role) {
			for (var i = sc.SelectedUser.length - 1; i >= 0; i--) {
				sc.changeUserRole(sc.SelectedUser[i], role)
			}
			sc.SelectedUser = [];
			sc.$evalAsync();
		}

		sc.changeUserRole = function (user, role) {
			var index = sc.userList.indexOf(user);
			if (index != -1)
			{
				sc.userList[index].role = role;
				ref.child(sc.userList[index].uid).update({role: role});
			}
		}

		sc.changeStatus = function (user, status) {
			var index = sc.userList.indexOf(user);
			if (index != -1)
			{
				sc.userList[index].status = status;
				ref.child(sc.userList[index].uid).update({status: status});
			}
		}

		sc.Upload = {};

		sc.chooseFilm = function(event){
			var file = event.target.files[0];
			sc.isReadyUpload = true;
			sc.$evalAsync();

			storageService.uploadFile($scope, 'films', file);

			sc.$on('updateUploadProgress' + file.name, function (event, data) {
				sc.MyStyle = {width: data.progress + '%'};
				sc.Status = "Uploading " + data.progress + '%';
				sc.$evalAsync();
			});

			sc.$on('uploadDone' + file.name, function (event, data) {
				sc.Status = "Upload Done!";
				sc.upload.Source = data.url;
				sc.$evalAsync();
			});
		};

		sc.MyStyle = {width: '0' + '%'};

		sc.upload = {};

		sc.upload.Picture = "https://cdn3.iconfinder.com/data/icons/pictofoundry-pro-vector-set/512/UploadPhotos-512.png";
		sc.isPictureLoaded = true;
		sc.uploadPicture = function (event) {
			var files = event.target.files;
			storageService.uploadFile($scope, 'image', files[0]);
			sc.isPictureLoaded = false;
			sc.$evalAsync();
			sc.$on('updateUploadProgress' + files[0].name, function (event, data) {
				console.log(data);
			});

			sc.$on('uploadDone' + files[0].name, function (event, data) {
				sc.upload.Picture = data.url;
				sc.isPictureLoaded = true;
				sc.$evalAsync();
			});
		};

		//Add actor//
		sc.openModal = function openModal(modalId) {
			$('#' + modalId).openModal();
			sc.actor = {};
			console.log('#' + modalId + 'opened');
			sc.actor.Picture = "http://www.freeiconspng.com/uploads/go-back--gallery-for--contact-person-icon-png-21.png";
		}

		sc.isActorPictureLoaded = true;
		sc.uploadActorPicture = function (event) {
			sc.isActorPictureLoaded = false;
			sc.$evalAsync();
			var file = event.target.files[0];

			storageService.uploadFile($scope, 'image', file);

			sc.$on('updateUploadProgress' + file.name, function (event, data) {
				console.log(data);
			});

			sc.$on('uploadDone' + file.name, function (event, data) {
				sc.actor.Picture = data.url;
				sc.isActorPictureLoaded = true;
				sc.$evalAsync();
			});
		};

		sc.actorCheckDone = function () {
			if (sc.actor == undefined)
				return false;
			return sc.actor.Name != undefined && sc.actor.Name_In_Film != undefined && sc.actor.Name != "" && sc.actor.Name_In_Film != "";
		}

		sc.submitActor = function () {
			if (sc.actorCheckDone())
				$('#addActorModal').closeModal();

			if (sc.upload.Actors == undefined)
				sc.upload.Actors = [];

			sc.upload.Actors.push(sc.actor);
			AdminService.updateMaterialElement();
		}

		sc.isDatabaseUploaded = true;
		sc.uploadFilmToDatabase = function () {
			var check = AdminService.checkValidData(sc.upload);
			if (check.valid == false)
			{
				Materialize.toast(check.message);
				return;
			}
			sc.isDatabaseUploaded = false;
			DatabaseService.uploadFilmDatabase(sc.upload, "adminUpload").then(
				function (res) {
					sc.isDatabaseUploaded = true;
					Materialize.toast("Film Upload Done!");
				});
		}

		sc.chooseJSON = function (event) {
			var file = event.target.files[0];
			var reader = new FileReader();
			var Object = {};
			reader.onloadend = function (evt) {
				Object = JSON.parse(evt.target.result);
				sc.upload = Object;
				AdminService.updateMaterialElement();
				AdminService.updateSelectElements(sc.upload);
				sc.$evalAsync();
			}

			reader.readAsText(file);
		}

		sc.prepairElements = function () {
			AdminService.prepairElements();
		}
	});
})();