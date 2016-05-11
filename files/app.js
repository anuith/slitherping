var app = angular.module('PingCheck', [])

.controller('MainCtrl', ['$scope', '$filter', '$q', 'pingCheckService', function ($scope, $filter, $q, $ping) {
    $scope.name = "man";
    $scope.iptable = [];
    $scope.maxPing = 300;
    $scope.count = 0;
    $scope.allcount = 0;

    $scope.ready = false;
    $scope.working = false;
    $scope.okcount = 0;
    $scope.maxcount = 25;
    
    var okping = 200;

    $scope.pingFilter = function (item) {
        if (item.ok) return true;
        if ($scope.count / $scope.allcount >= 0.9 && $scope.okcount < $scope.maxcount) return true;
        if (isNaN(item.ping)) return false;
    };

    $scope.stop = function (track) {
        if ('undefined' == typeof (track)) track = true;
        track && ga('send', 'event', 'pingcheck', 'stop', null, $scope.count);
        if ($ping.defer)
            $ping.defer.reject();
    };

    $scope.$watch('okcount', function () {
        if ($scope.okcount >= $scope.maxcount)
            $scope.stop(false);
    });

    $scope.copy = function (item) {
        ga('send', 'event', 'server', 'copy', item.ip);
    };

    var promise = null;

    $scope.begin = function (maxPing) {
        if ('undefined' == typeof (maxPing)) $ping.maxPing = $scope.maxPing / 1.5;
        else $ping.maxPing = maxPing / 1.5;

        ga('send', 'event', 'pingcheck', 'start');
        promise = $q.all([]);
        $scope.count = 0;
        $scope.okcount = 0;
        $scope.ready = false;
        $scope.working = true;
        angular.forEach($scope.iptable, function (item) {
            promise = promise.then(function () {
                return $ping.checkPing(item).then(function () {
                    $scope.count++;
                    if (item.ping <= okping) {
                        item.ok = true;
                        $scope.okcount++;
                    }
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
    var self = this;

    function millis() {
        return (new Date()).getTime();
    }

    this.maxPing = 300 / 1.5;

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

            if (item.ping < self.maxPing)
                self.maxPing = item.ping;

            $timeout.cancel(timer);
            defer.resolve();
        };

        item.begin = millis();
        img.src = '//' + item.ip + '/ping?q=' + random;

        timer = $timeout(function () {
            console.log(item.ip, 'timeout', millis() - item.begin);

            img.src = "";
            img.onload = img.onerror = img.onabort = function () {};

            item.ping = 'x';

            $timeout.cancel(timer);
            defer.resolve();
        }, self.maxPing * 1.5);

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
                ga('send', 'event', 'server', 'click', this.value);
                if (!$window.getSelection().toString()) {
                    this.setSelectionRange(0, this.value.length)
                }
            });
        }
    };
}]);