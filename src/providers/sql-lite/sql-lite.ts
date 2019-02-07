import {Injectable} from '@angular/core';
import {SQLite, SQLiteObject} from '@ionic-native/sqlite';
import {ApiServiceProvider} from '../api-service/api-service';
//import {Output, EventEmitter} from '@angular/core';
import forEach from 'lodash/forEach';
import keys from 'lodash/keys';
import indexOf from 'lodash/indexOf';
import {constantidType} from './../config/config';
import {UUID} from 'angular2-uuid';
import {SQLitePorter} from '@ionic-native/sqlite-porter';
import filter from 'lodash/filter';
import {url} from '../config/config';
import {AlertController} from 'ionic-angular';

@Injectable()
export class SqlLiteProvider {
    db: SQLiteObject;
    //    @Output()
    //    progressDataEvent = new EventEmitter();
    //    tablesEvent = new EventEmitter();
    localDBdata: any;
    err: boolean = false;
    InsertDataKey: any;
    constructor(public alertCtrl: AlertController, private sqlitePorter: SQLitePorter, private _apiProvider: ApiServiceProvider, private sqlite: SQLite) {}
    createSqlLiteDB() {
        return new Promise((resolve, reject) => {
            let createData: any = {};
            createData['name'] = 'reorderDB';
            createData['location'] = 'default';
            this.sqlite.create(createData)
                .then((db: SQLiteObject) => {
                    this.db = db;
                    resolve(db);
                })
                .catch(e => {
                    console.log(e)
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
    getAllTableDataFromLocal() {
        return new Promise((resolve, reject) => {
            this.sqlitePorter.exportDbToJson(this.db)
                .then((res) => {
                    this.localDBdata = res['data']['inserts'];
                    resolve(true);
                }, (err) => {
                    reject(err)
                })
        })
    }
    dropTable(name) {
        return new Promise((resolve, reject) => {
            this.db.executeSql(`DROP TABLE IF EXISTS ${name}`, []).then(() => {
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
                this.getKeyForInsertData().then(res => {this.InsertDataKey = res;})
                forEach(res, (value, key) => {
                    count++;
                    this.db.executeSql(`${value}`, []).then(() => {})
                        .catch(e => console.log(e)).then(() => {
                            if (count == findLength.length) {
                                resolve(true);
                            } else {
                                reject();
                            }
                        });
                })
            })
        })
    }
    getKeyForInsertData() {
        return new Promise((resolve, reject) => {
            this._apiProvider.apiCall("assets/jsonData/queryKey.json").subscribe(res => {
                resolve(res);
            })
        })
    }
    insertSqlLiteData(tableName, valueTable) {
        return new Promise((resolve, reject) => {
            this.checkDataIsExistInLocal(tableName, valueTable).then((res) => {
                if (res) {
                    let insertData: string = '';
                    forEach(valueTable, (record, key) => {
                        //                        console.log("record, key", record, key)
                        if (indexOf(this.InsertDataKey[tableName], key) != -1) {
                            if (record && typeof record != "number") {
                                record = record.replace(/['"]+/g, '');
                            }
                            if (record == "" || record == " ") {
                                record = null;
                            }
                            else {
                                if (key == constantidType.idLocal && record == -1) {
                                    //   record = this.createIDLocal();
                                }
                            }
                            if (key == 'IsDefault' && record == null) {
                                record = 0;
                            }
                            insertData = insertData + `"` + record + `"` + `` + `,`;
                        }
                    })
                    insertData = insertData.slice(0, -1);
                    this.db.executeSql(`insert into ${tableName} VALUES (${insertData})`, []).then(() => {
                        //this.getCurrentTableProcessDetails("Insert", tableName);
                        resolve(tableName);
                    })
                        .catch(e => {
                            console.log("insert error", e)
                            reject(e);
                        });
                } else {
                    resolve(tableName);
                }
            })
        });
    }
    updateSqlLiteData(tableName, valueTable) {
        return new Promise((resolve, reject) => {
            let insertData: string = "";
            forEach(valueTable, (record, key) => {
                if (indexOf(this.InsertDataKey[tableName], key) != -1) {
                    if (record && typeof record != "number") {
                        record = record.replace(/['"]+/g, '');
                    }
                    if (record == "" || record == " ") {
                        record = null;
                    }
                    else {
                        if (key == constantidType.idLocal && record == -1) {
                            //   record = this.createIDLocal();
                        }
                    }
                    if (key == 'IsDefault' && record == null) {
                        record = 0;
                    }
                    insertData = insertData + key + `=` + `'` + record + `'` + `` + `,`;
                }
            });
            insertData = insertData.slice(0, -1);
            let id = (tableName != 'Product') ? 'IDWeb' : 'ID';
            this.db.executeSql(`UPDATE ${tableName} SET ${insertData} WHERE ${id}='${tableName != 'Product' ? valueTable['IDWeb'] : valueTable['ID']}'`, []).then((res) => {
                resolve(tableName);
            })
                .catch(e => {
                    console.log("update error", e)
                    reject(e);
                });
        });
    }
    checkDataExistInTable(tableName) {
        return new Promise((resolve, reject) => {
            this.db.executeSql(`SELECT * from ${tableName}`, []).then((data) => resolve(data.rows.length))
                .catch(e => console.log(e));
        })
    }
    getCurrentTableProcessDetails(query, tableName) {
        //        this.tablesEvent.emit({query: query, tableName: tableName})
    }
    progressBar(tableName, NoOfTotalTables, error?) {
        //        this.progressDataEvent.emit({"tableName": tableName, NoOfTotalTables: NoOfTotalTables, error: error});
    }
    checkApiType(type, data?) {
        return new Promise((resolve, reject) => {
            this._apiProvider.apiCallByPost(`${url.url}/get/userData`, data).subscribe(res => {
                this.deleteRecord("ProductCodes").then((res) => {
                })
                resolve(this.manageSqlLiteData(res));
            }, (error) => {
                reject(true);
            })
        })
    }
    compareDateAndTime(tableName, row) {
        if (row['IDWeb'] && typeof row['IDWeb'] == "number") {
            row['IDWeb'] = `${row['IDWeb']}`;
        }
        let filterData = filter(this.localDBdata[tableName], {IDWeb: row['IDWeb']})[0];
        if (filterData) {
            if (filterData['LastUpdatedDateTime']) {
                let localTime = new Date(filterData['LastUpdatedDateTime']);
                let remoteTime = new Date(row['LastUpdatedDateTime']);
                if (filterData && filterData['LastUpdatedDateTime'] && remoteTime < localTime) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return true;
            }
        } else {
            return false;
        }
    }
    compareId(tableName, row) {
        let filterData: any;
        if (tableName == "Product") {
            filterData = filter(this.localDBdata[tableName], {ID: `${row['ID']}`});
        } else {
            return false;
        }
        if (filterData && filterData.length) {
            return true;
        } else {
            return false;
        }
    }
    checkIdIfNegative(userdataIDWeb, userdataIDLocal) {
        let idForConditionCheck = {};
        if (userdataIDWeb != -1) {
            idForConditionCheck['name'] = constantidType['listWeb'];
            idForConditionCheck['value'] = userdataIDWeb;
            return idForConditionCheck;
        } else {
            idForConditionCheck['name'] = constantidType['listLocal'];
            idForConditionCheck['value'] = userdataIDLocal;
            return idForConditionCheck;
        }
    }
    deleteDataFromTable(IDLocal, IDWeb) {
        return new Promise((resolve, reject) => {
            this.getAllTableDataFromLocal().then(() => {
                let idAndValue = this.checkIdIfNegative(IDWeb, IDLocal);
                let data = {};
                data[idAndValue['name']] = (idAndValue['value'] * 1);
                let filterData = filter(this.localDBdata['Product_Control_Line'], data)[0];
                if (filterData != undefined) {
                    this.db.executeSql(`delete from Product_Control_Line WHERE ${idAndValue['name']}=${idAndValue['value'] * 1}`, []).then((res) => {
                        this.db.executeSql(`delete from Product WHERE ID=${filterData['ProductIDLocal'] * 1}`, []).then((res) => {
                            this.db.executeSql(`delete from ProductCodes WHERE ProductID=${filterData['ProductIDLocal'] * 1}`, []).then((res) => {
                                this.db.executeSql(`delete from List_to_Contact WHERE ${idAndValue['name']}=${idAndValue['value'] * 1}`, []).then((res) => {
                                    resolve(true)
                                })
                            })
                        })
                    })
                        .catch(e => reject(e))
                } else {
                    resolve(true)
                }
            })
        })
    }
    checkDataIsExistInLocal(tableName, row) {
        return new Promise((resolve, reject) => {
            let refData = JSON.parse(JSON.stringify(row));
            if (refData.LastUpdatedDateTime) {
                delete refData.LastUpdatedDateTime;
            }
            if (refData['ReLoginToSubmit']) {
                delete refData.ReLoginToSubmit;
            }
            if (refData['IsDefault']) {
                delete refData.IsDefault;
            }
            if (refData['IsActive']) {
                delete refData.IsActive;
            }
            forEach(refData, (value, key) => {
                if (indexOf(this.InsertDataKey[tableName], key) != -1) {
                    if (value && typeof value != "number") {
                        //                    console.log("value",value)
                        refData[key] = value.replace(/['"]+/g, '');
                    }
                    if (value && typeof value == "number") {
                        refData[key] = `${value}`;
                    }
                    if (value == '' || value == " " || value == "" || value == "\u0000") {
                        refData[key] = null;
                    }
                } else {
                    delete refData[key];
                }
            })
            let filterData = filter(this.localDBdata[tableName], refData);
            if (filterData.length) {
                resolve(false);
            } else {
                resolve(true);
            }
        })
    }
    manageSqlLiteData(res) {
        return new Promise((resolve, reject) => {
            if (res['data'] && res['data'].length) {
                let manageData = (data, callback) => {
                    let RefData = data;
                    let first_data = RefData.splice(0, 1)[0];
                    if (first_data && first_data.type == "table") {
                        this.checkDataExistInTable(first_data.name).then((isExist) => {
                            if (isExist) {
                                insertOrUpdate(first_data, (response) => {
                                    if (RefData.length) {
                                        manageData(RefData, callback);

                                    } else {
                                        callback(true)
                                    }
                                })
                            } else {
                                insert(first_data, (response) => {
                                    if (RefData.length) {
                                        manageData(RefData, callback)
                                    } else {
                                        callback(true)
                                    }
                                })

                            }
                        })
                    }
                }

                let insert = (data, callback) => {
                    let first_row = data['data'].splice(0, 1)[0];
                    this.insertSqlLiteData(data.name, first_row).then((res) => {
                        if (data['data'].length) {
                            insert(data, callback);
                        } else {
                            callback(true);
                        }
                    }, (err) => {
                        this.err = true;
                        callback(true)
                        console.log(err)
                    })
                }

                let insertOrUpdate = (data, callback) => {
                    let first_row = data['data'].splice(0, 1)[0];
                    if (this.compareId(data.name, first_row)) {
                        this.updateSqlLiteData(data.name, first_row).then(() => {
                            if (data['data'].length) {
                                insertOrUpdate(data, callback)
                            } else {
                                callback(true)
                            }
                        });

                    } else {
                        if (first_row && first_row['IDWeb'] == -1) {
                            this.insertSqlLiteData(data.name, first_row).then((res) => {
                                if (data['data'].length) {
                                    insertOrUpdate(data, callback)
                                } else {
                                    callback(true)
                                }
                            });
                        } else {
                            if (this.compareDateAndTime(data.name, first_row)) {
                                this.updateSqlLiteData(data.name, first_row).then(() => {
                                    //                                if (data.name == "Product_Control_List") {
                                    //                                    this.deleteDataFromTable(first_row['IDLocal'], first_row['IDWeb']).then(() => {
                                    //                                        if (data['data'].length) {
                                    //                                            insertOrUpdate(data, callback)
                                    //                                        } else {
                                    //                                            callback(true)
                                    //                                        }
                                    //                                    })
                                    //                                } else {
                                    if (data['data'].length) {
                                        insertOrUpdate(data, callback)
                                    } else {
                                        callback(true)
                                    }
                                    //                                }

                                });
                            } else {
                                if (this.checkDataIsExistInLocal(data.name, first_row)) {
                                    this.insertSqlLiteData(data.name, first_row).then((res) => {
                                        if (data['data'].length) {
                                            insertOrUpdate(data, callback)
                                        } else {
                                            callback(true)
                                        }
                                    }, (err) => {
                                        this.err = true;
                                        callback(true)
                                        console.log(err)
                                    });
                                } else {
                                    if (data['data'].length) {
                                        insertOrUpdate(data, callback)
                                    } else {
                                        callback(true)
                                    }
                                }
                            }
                        }
                    }
                }

                manageData(res['data'], (response) => {
                    if (this.err) {
                        let alert = this.alertCtrl.create({
                            title: 'Error!',
                            subTitle: 'Some thing went wrong',
                            buttons: ['OK']
                        });
                        alert.present();
                    }
                    resolve(true);
                })
            } else {
                resolve(res);
            }
        });
    }


}