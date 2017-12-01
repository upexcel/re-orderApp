import {Injectable} from '@angular/core';
import {SQLiteObject} from '@ionic-native/sqlite';
import {SqlLiteProvider} from '../sql-lite/sql-lite';
import {LocalStorageProvider} from './../local-storage/local-storage';
@Injectable()
export class LoginProvider {
    DataBase: SQLiteObject;
    constructor(private _localStorageProvider: LocalStorageProvider, private _sqlProvider: SqlLiteProvider) {}
    convertLoginResTojson(res) {
        let userData = [];
        for (let i = 0; i < res.rows.length; i++) {
            userData.push(res.rows.item(i))
        }
        this._localStorageProvider.setLocalStorageData('userDetails', userData)
    }
    authUserCustomer(formDataEmail, formDataEmailPassword) {
        return new Promise((resolve, reject) => {
            this._sqlProvider.openDb().then((db: SQLiteObject) => {
                this.DataBase = db;
                this.DataBase.executeSql(`SELECT * FROM Customer_Table WHERE EmailAddress='${formDataEmail}' AND Password='${formDataEmailPassword}'`, []).then((res) => {
                    if (res.rows.length) {
                        this.convertLoginResTojson(res);
                        this._localStorageProvider.setLocalStorageData('userType', "customer");
                        resolve(res);
                    } else {
                        resolve(this.authUserContact(formDataEmail, formDataEmailPassword));
                    }
                }).catch(e => reject(e));
            })
        })
    }
    authUserContact(formDataEmail, formDataEmailPassword) {
        return new Promise((resolve, reject) => {
            this.DataBase.executeSql(`SELECT * FROM Contact_Table WHERE EmailAddress='${formDataEmail}' AND Password='${formDataEmailPassword}'`, []).then((res) => {
                if (res.rows.length) {
                    this.convertLoginResTojson(res)
                    this._localStorageProvider.setLocalStorageData('userType', "contact");
                    resolve(res);
                } else {
                    console.log("user not exist");
                }
            }).catch(e => reject(e));
        })
    }
}
