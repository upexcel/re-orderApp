import {Injectable} from '@angular/core';
import {SQLite, SQLiteObject} from '@ionic-native/sqlite';
import {ApiServiceProvider} from '../api-service/api-service';
import {Output, EventEmitter} from '@angular/core';
import forEach from 'lodash/forEach';
import keys from 'lodash/keys';
import clone from 'lodash/clone';
import {constantidType} from './../config/config';
import {UUID} from 'angular2-uuid';
import {SQLitePorter} from '@ionic-native/sqlite-porter';
import filter from 'lodash/filter';
import {Platform} from 'ionic-angular';
declare var cordova: any

@Injectable()
export class SqlLiteProvider {
    db: SQLiteObject;
    @Output()
    progressDataEvent = new EventEmitter();
    tablesEvent = new EventEmitter();
    localDBdata: any;
    constructor(private platform: Platform, private sqlitePorter: SQLitePorter, private _apiProvider: ApiServiceProvider, private sqlite: SQLite) {}
    createSqlLiteDB() {
        return new Promise((resolve, reject) => {
            let createData: any = {};
            createData['name'] = 'reorderDB';
            createData['location'] = 'default';
            this.sqlite.create(createData)
                .then((db: SQLiteObject) => {
                    this.db = db;
                    alert("db")
                    resolve(db);
                })
                .catch(e => {
                    reject(e)
                });
        });
    }
    openDb() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
            } else {
                resolve(this.createSqlLiteDB());
            }
        });
    }
    //    getAllTableDataFromLocal() {
    //        return new Promise((resolve, reject) => {
    //            this.sqlitePorter.exportDbToJson(this.db)
    //                .then((res) => {
    //                    this.localDBdata = res['data']['inserts'];
    //                    resolve(true);
    //                }, (err) => {reject(err)})
    //        })
    //    }
    getAllTableDataFromLocal() {
        return new Promise((resolve, reject) => {
            if (this.platform.is('cordova')) {
                alert("cordova")
                cordova.plugins.sqlitePorter.exportDbToJson(this.db, {
                    successFn: resolve(this.successFn),
                    errorFn: reject(this.errFn)
                });
            } else {
                alert("cordova not")
            }
        })
    }
    successFn = function (json) {
        return new Promise((resolve, reject) => {
            this.localDBdata = json['data']['inserts'];
            alert(json);
            resolve(true);
        })
    }
    errFn = function (err) {
        return new Promise((resolve, reject) => {
            alert("err");
            reject(err);
        })
    }
    dropTable(name) {
        return new Promise((resolve, reject) => {
            this.db.executeSql(`DROP TABLE IF EXISTS ${name}`, []).then(() => {
                console.log('Executed SQL drop')
                resolve(true);
            })
                .catch(e => reject(e))
        })
    }
    deleteRecord(name) {
        return new Promise((resolve, reject) => {
            this.db.executeSql(`delete from ${name}`, []).then(() => {
                resolve(true);
            })
                .catch(e => reject(e))
        })
    }
    createIDLocal() {
        return UUID.UUID();
    }
    createSqlLiteTable() {
        return new Promise((resolve, reject) => {
            this._apiProvider.apiCall("assets/jsonData/structure.json").subscribe(res => {
                let findLength = keys(res);
                let count = 0;
                forEach(res, (value, key) => {
                    count++;
                    this.db.executeSql(`${value}`, []).then(() => {alert("table create")})
                        .catch(e => alert(e)).then(() => {
                            if (count == findLength.length) {
                                resolve(true);
                            }
                        });
                })
            })
        })
    }
    insertSqlLiteData(tableName, valueTable) {
        return new Promise((resolve, reject) => {
            let insertData: string = "";
            forEach(valueTable, (record, key) => {
                if (key == constantidType.idLocal && record == -1) {
                    record = this.createIDLocal();
                }
                insertData = insertData + '"' + record + '"' + "" + ",";
            })
            insertData = insertData.slice(0, -1);
            this.db.executeSql(`insert into ${tableName} VALUES (${insertData})`, []).then(() => {
                this.getCurrentTableProcessDetails("Insert", tableName);
                alert(tableName)
                resolve(tableName);
            })
                .catch(e => {
                    alert(e)
                    console.log(e)
                    reject(e);
                });
        });
    }
    updateSqlLiteData(tableName, valueTable) {
        return new Promise((resolve, reject) => {
            let insertData: string = "";
            forEach(valueTable, (record, key) => {
                insertData = insertData + key + "=" + "'" + record + "'" + "" + ","
            })
            insertData = insertData.slice(0, -1);
            this.db.executeSql(`UPDATE ${tableName} SET ${insertData} WHERE IDWeb != -1`, []).then(() => {
                this.getCurrentTableProcessDetails("Update", tableName);
                resolve(tableName);
            })
                .catch(e => {
                    console.log(e);
                    reject(e);
                });
        });
    }
    checkDataExistInTable(tableName) {
        return new Promise((resolve, reject) => {
            this.db.executeSql(`SELECT * from ${tableName}`, []).then((data) => resolve(data.rows.length))
                .catch(e => alert(e + "checkTable"));
        })
    }
    getCurrentTableProcessDetails(query, tableName) {
        this.tablesEvent.emit({query: query, tableName: tableName})
    }
    progressBar(tableName, NoOfTotalTables, error?) {
        this.progressDataEvent.emit({"tableName": tableName, NoOfTotalTables: NoOfTotalTables, error: error});
    }
    checkApiType(type, data?) {
        return new Promise((resolve, reject) => {
            if (type == "login") {
                this._apiProvider.apiCall("http://5.9.144.226:3031/get/loginDetails").subscribe(res => {
                    alert(res + "first")
                    resolve(this.manageSqlLiteData(res));
                }, (error) => {
                    alert("not got res")
                    this.progressBar("", 0, "error");
                    reject(true);
                })
            } else {
                this._apiProvider.apiCallByPost("http://5.9.144.226:3031/get/userData", data).subscribe(res => {
                    resolve(this.manageSqlLiteData(res));
                }, (error) => {
                    reject(true);
                })
            }
        })
    }
    compareDateAndTime(tableName, row) {
        let filterData = filter(this.localDBdata[tableName], {IDWeb: row['IDWeb']})[0];
        let localTime = new Date(filterData['LastUpdatedDateTime']);
        let remoteTime = new Date(row['LastUpdatedDateTime']);
        if (filterData && filterData['LastUpdatedDateTime'] && remoteTime < localTime) {
            return false;
        } else {
            return true;
        }
    }
    manageSqlLiteData(res) {
        return new Promise((resolve, reject) => {
            let totalTable = clone(res['data']);
            alert(res+"totalTable")
            if (res['data'] && res['data'].length) {
                let manageData = (data, callback) => {
                    let RefData = data;
                    alert(data + "manageSqlLiteData")
                    let first_data = RefData.splice(0, 1)[0];
                    if (first_data && first_data.type == "table") {
                        this.checkDataExistInTable(first_data.name).then((isExist) => {
                            if (isExist && (first_data.name == "Customer_Table" || first_data.name == "Contact_Table" || first_data.name == "Product_Control_List" || first_data.name == "Product_Control_Line" || first_data.name == "List_to_Contact")) {
                                insertOrUpdate(first_data, (response) => {
                                    if (RefData.length) {
                                        this.progressBar(first_data['name'], totalTable.length);
                                        manageData(RefData, callback);

                                    } else {
                                        this.progressBar(first_data['name'], totalTable.length);
                                        callback(true)
                                    }
                                })
                            } else {
                                insert(first_data, (response) => {
                                    if (RefData.length) {
                                        this.progressBar(first_data['name'], totalTable.length);
                                        manageData(RefData, callback)
                                    } else {
                                        this.progressBar(first_data['name'], totalTable.length);
                                        callback(true)
                                    }
                                })
                            }
                        })
                    }
                }

                let insert = (data, callback) => {
                    let first_row = data['data'].splice(0, 1)[0];
                    this.insertSqlLiteData(data.name, first_row).then(() => {
                        if (data['data'].length) {
                            insert(data, callback);
                        } else {
                            callback(true);
                        }
                    });
                }

                let insertOrUpdate = (data, callback) => {
                    let first_row = data['data'].splice(0, 1)[0];
                    if (first_row && first_row['IDWeb'] == -1) {
                        this.insertSqlLiteData(data.name, first_row).then(() => {
                            if (data['data'].length) {
                                insertOrUpdate(data, callback)
                            } else {
                                callback(true)
                            }
                        });
                    } else {
                        if (this.compareDateAndTime(data.name, first_row)) {
                            this.updateSqlLiteData(data.name, first_row).then(() => {
                                if (data['data'].length) {
                                    insertOrUpdate(data, callback)
                                } else {
                                    callback(true)
                                }
                            });
                        }
                    }
                }

                manageData(res['data'], (response) => {
                    resolve(true);
                })
            }
        });
    }


}