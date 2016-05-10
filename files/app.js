var app = angular.module('PingCheck', [])

.controller('MainCtrl', ['$scope', '$filter', '$q', 'pingCheckService', function ($scope, $filter, $q, $ping) {
    $scope.name = "man";
    $scope.iptable = [];
    $scope.count = 0;
    $scope.allcount = 0;

    $scope.ready = false;
    $scope.working = false;

    $scope.isPing = function (item) {
        return !isNaN(item.ping);
    }

    $scope.stop = function () {
        if ($ping.defer)
            $ping.defer.reject();
    };

    var promise = null;

    $scope.begin = function () {
        promise = $q.all([]);
        $scope.count = 0;
        $scope.ready = false;
        $scope.working = true;
        angular.forEach($scope.iptable, function (item) {
            promise = promise.then(function () {
                return $ping.checkPing(item).then(function () {
                    $scope.count++;
                });
            });
        });
        promise.finally(function () {
            $scope.ready = true;
            $scope.working = false;
            console.log('Finished');
        });
    };

    $q.all([$ping.getIptable()]).then(function (iptable) {
        $scope.ready = true;
        $scope.iptable = iptable[0];
        $scope.allcount = $scope.iptable.length;
    });
}]).service('pingCheckService', ['$http', '$q', '$timeout', function ($http, $q, $timeout) {
    function millis() {
        return (new Date()).getTime();
    }

    var minPing = 250;

    function getMinPing() {
        return minPing;
    }

    this.defer = null;

    this.checkPing = function (item) {
        var defer = this.defer = $q.defer();

        var random = Math.floor(Math.random() * 0xFFFFFFFFFFFFFFFF).toString(36);
        var img = new Image();
        img.onload = img.onerror = img.onabort = function () {
            item.end = millis();
            item.ping = item.end - item.begin;

            console.log(item.ip, 'finish', item.ping);

            img.onload = img.onerror = img.onabort = function () {};

            if (item.ping < minPing)
                minPing = item.ping;

            $timeout.cancel(timer);
            defer.resolve();
        };

        item.begin = millis();
        img.src = '//' + item.ip + '/ping?q=' + random;

        timer = $timeout(function () {
            console.log(item.ip, 'timeout', millis() - item.begin);

            img.onload = img.onerror = img.onabort = function () {};

            item.ping = 'x';

            $timeout.cancel(timer);
            defer.resolve();
        }, minPing * 1.1);

        return defer.promise;
    }

    this.getIptable = function () {
        return $http.get('files/iptable.json').then(function (r) {
            var iptable = [];
            angular.forEach(r.data, function (item) {
                iptable.push({
                    ip: item,
                    ping: '-'
                });
            });
            return iptable;
        });
    }
}]).directive('selectOnClick', ['$window', function ($window) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('click', function () {
                if (!$window.getSelection().toString()) {
                    this.setSelectionRange(0, this.value.length)
                }
            });
        }
    };
}]);
