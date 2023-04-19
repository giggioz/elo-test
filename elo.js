var _ = require('underscore');
var async = require('async');

var noop = function() {};

function eloManager(options){
    this.gameName = options.gameName;
    this.rc = options.redisClient;
    this.redisKeychain = options.redisKeychain;
    this.PlayerHelper = options.PlayerHelper;
}

function getNewElo(currentElo, opponentElo, currentResult) {
    var map = {};
    map['win'] = 1;
    map['opponentdisconnectedwon'] = 1;
    map['loss'] = 0;
    map['unfinished'] = 0;
    map['draw'] = 0.5;

    var k = 32;
    if(currentElo <= 2100) {
        k = 32;
    } else if(currentElo > 2100 && currentElo <= 2400) {
        k = 24;
    } else if(currentElo > 2400) {
        k = 16;
    }

    //console.log("point table is", currentElo, opponentElo, k, currentResult);
    var score = map[currentResult];
    var ea = 1 / (1+ Math.pow(10, (parseInt(opponentElo,10) - parseInt(currentElo,10)) / 400));

    return parseInt(currentElo,10) + Math.round(k * (score - ea));
}

eloManager.prototype.getNewElo = getNewElo

eloManager.prototype.updateElo = function(playerPayload1, playerPayload2, callback) {
    callback = callback || noop;

    if (!playerPayload1) {
        return callback(new Error('playerPayload1 missing'));
    }
    if (!playerPayload1.playerId) {
        //return callback('playerPayload1 playerId missing');
        return callback();
    }
    if (!playerPayload2) {
        return callback(new Error('playerPayload2 missing'));
    }
    if (!playerPayload2.playerId) {
        // return callback('playerPayload2 playerId missing');
        return callback();
    }

    var self = this;

    // var leaderboardEloK;
    // leaderboardEloK = this.gameName + ':leaderboards:elo';

    // var leaderboardEloK = this.redisKeychain.zLeaderboardMontly(payload.context.level,moment(payload.savedAt).format('YYYY:MM'));

    var pguid = playerPayload1.playerId;

    var playerEloZset = this.redisKeychain.SM_zLeaderboardElo();
    var playerEloK = this.redisKeychain.SM_kPlayerElo(pguid);

    var player1Elo,player2Elo;

    async.waterfall(
        [
            function(callback){
                self.getElo(playerPayload1.playerId,function(err,elo){
                    if(err) {
                        return callback(err);
                    }
                    if(elo) {
                        player1Elo = parseInt(elo,10);
                    } else {
                        player1Elo = 1500;
                    }
                    callback();
                });
            },
            function(callback){
                self.getElo(playerPayload2.playerId,function(err,elo){
                    if(err) {
                        return callback(err);
                    }
                    if(elo) {
                        player2Elo = parseInt(elo,10);
                    } else {
                        player2Elo = 1500;
                    }
                    callback();
                });
            },
            function(callback){
                var p1newElo = getNewElo(player1Elo,player2Elo,playerPayload1.result);
                if(!p1newElo) {
                    console.log(player1Elo,player2Elo,playerPayload1.result,"new elo:",p1newElo);
                }

                self.updateEloScore(pguid, p1newElo, callback);

                // // keep on saving on old zset
                // self.rc.zadd(playerEloZset.toString(),p1newElo,pguid,function(err){
                //     if(err) {
                //         return callback(err);
                //     }
                //     self.rc.set(playerEloK.toString(),p1newElo,function(err){
                //         if(err) {
                //             return callback(err);
                //         }
                //         self.rc.expire(playerEloK.toString(),playerEloK.expiry);
                //         callback();
                //     });
                // });
            }
        ],
        function(error) {
            if (error) {
              if(error.code !== "NON_EXISTING_PLAYER") {
                console.log('Error on updateElo', error.message);
              }
            }
            //console.log('updateCounters finished processing', playerPayload.playerId);
            callback(error);
        }
    );
};

eloManager.prototype.updateEloScore = function(pguid, eloscore, callback) {
    callback = callback || noop;

    if (!pguid) {
        return callback(new Error('pguid missing'));
    }
    if (!eloscore) {
        return callback(new Error('eloscore missing'));
    }

    var playerEloZset = this.redisKeychain.SM_zLeaderboardElo();
    var playerEloK = this.redisKeychain.SM_kPlayerElo(pguid);

    var self = this;

    // keep on saving on old zset
    self.rc.zadd(playerEloZset.toString(),eloscore,pguid,function(err){
        if(err) {
            return callback(err);
        }
        self.PlayerHelper.updatePlayerElo(pguid,eloscore,function(err){
            if(err) {
                return callback(err);
            }

            self.rc.del(playerEloK.toString());
            //cap elo zset to 25000
            self.rc.zremrangebyrank(playerEloZset.toString(),0,-25001,function(err){
                if(err){
                    return callback(err);
                }

                callback();
            });

        });

    });

};

eloManager.prototype.getElo = function(pguid,callback){
    callback = callback || noop;

    if (!pguid) {
        return callback(new Error('pguid missing'));
    }

    var self = this;

    var playerEloK = this.redisKeychain.SM_kPlayerElo(pguid);

    this.rc.get(playerEloK.toString(),function(err,elo){
        if(err) {
            return callback(err);
        }
        if(!elo) {
            self.PlayerHelper.getPlayerElo(pguid,function(err,elo){
                if(err) {
                    return callback(err);
                }
                var eloscore = elo ? elo : 1500;
                if(eloscore === undefined) {
                    console.log("undefined eloscore from getPlayerElo",elo,pguid,eloscore);
                    return callback(null,1500);
                }
                if(eloscore === "undefined") {
                    console.log("undefined string eloscore from getPlayerElo",elo,pguid,eloscore);
                    return done(null,1500);
                }
                self.rc.set(playerEloK.toString(),eloscore,function(err){
                    if(err) {
                        return callback(err);
                    }
                    self.rc.expire(playerEloK.toString(),playerEloK.expiry);
                    callback(null, eloscore);
                });
            });
        } else {
            callback(null,parseInt(elo,10));
        }
    });

};

module.exports = eloManager;
