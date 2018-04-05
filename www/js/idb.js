/*
 *  This file is part of CashReg.
 *
 *  CashReg is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CashReg is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with CashReg.  If not, see <http://www.gnu.org/licenses/>.
 *
 *  Copyright (c) 2018 cashreg.org
 */

/*
 *
 * idb.js - indexed db interface
 *
 * author: frank@hackdaworld.org
 *
 */

var idb = {
	version: '1',
	name: 'idb',
	handle: null,
	stores: {},
	onupgradeneeded: function(event) {
		idb.handle=event.target.result;
		idb.handle.onerror=function(event) {
			cl("idb: handle error - "+event.target.errorCode);
		};
		var ov=event.oldVersion;
		var nv=event.newVersion;
		if(ov<idb.version) {
			cl("idb: version upgrade ("+ov+" -> "+nv+')!');
			// stores
			for(var sn in idb.stores) {
				// key
				var store=idb.stores[sn]
				var key={};
				key[store['keytype']]=store['keyname'];
				cl("idb: creating store '"+sn+"' ("+
				   store.keytype+": "+store.keyname+")");
				store.os=idb.handle.createObjectStore(sn,key);
				// indices
				if(store.idx!==undefined) {
					var idx=store.idx[nv];
					if(idx===undefined) {
						cl('idb: missing version '+nv);
					}
					for(var iname in idx) {
						cl("idb: creating index '"+
						   iname+"' u: "+
						   idx[iname].unique+
						   " in store "+sn);
						store.os.createIndex(iname,
						                     iname,
						                     idx[iname]);
					}
				}
				// initial content
				vc=null;
				if(store.content!==undefined) {
					vc=store.content[nv];
				}
				if(vc===null) continue;
				if(vc!==undefined) {
					cl("idb: put content to store '"+
					   sn+"'");
					for(var c in vc) {
						objdbg(vc[c]);
						store.os.put(vc[c]);
					}
				}
			}
		}
		cl("idb: upgrade success! ("+ov+" -> "+nv+")");
	},
	onsuccess: function(event) {
		idb.handle=event.target.result;
		cl("idb: initialized successfuly ...");
		idb.successcb(event);
	},
	onerror: function(event) {
		cl("idb: error - "+this.error.message);
	},
	onblocked: function(event) {
		cl("idb: blocked");
	},
	init: function(name,successcb,version,stores,upgradecb) {
		if(!indexedDB) {
			cl("idb: indexed db not supported");
			return
		}
		if(name!==undefined)
			idb.name=name;
		if(version!==undefined)
			idb.version=version;
		if(stores!==undefined)
			idb.stores=stores;
		if(successcb!==undefined)
			idb.successcb=successcb;
		if(upgradecb!==undefined)
			idb.onupgradeneeded=upgradecb;
		cl("idb: init database '"+idb.name+"'");
		var req=indexedDB.open(idb.name,idb.version);
		req.onsuccess=idb.onsuccess;
		req.onupgradeneeded=idb.onupgradeneeded;
		req.onerror=idb.onerror;
		req.onblocked=idb.onblocked;
	},
	del_store: function(sname,callback) {
		var tx=db.handle.transaction(sname,'readwrite');
		var store=tx.objectStore(sname);
		var req=store.clear();
		req.onsuccess=function() {
			cl("db: store "+store.name+" deleted");
			callback();
		};
	},
	add_store_item: function(sname,item,callback) {
		var tx=idb.handle.transaction(sname,'readwrite');
		var store=tx.objectStore(sname);
		var req=store.add(item);
		req.onsuccess=function(event) {
			callback(event);
		};
		req.onerror=function(error) {
			cl("idb: add item error, "+error);
		};
	},
	del_store_item: function(sname,num,callback) {
		var tx=db.handle.transaction(sname,'readwrite');
		var store=tx.objectStore(sname);

		var kr=IDBKeyRange.bound(num,num,false,false);
		var req=store.openCursor(kr);

		req.onsuccess=function(event) {
			var cursor=event.target.result;
			if(cursor) {
				var res=cursor.delete();
				res.onsuccess=function(event) {
					callback(event);
				};
				res.onerror=function(error) {
					cl("db: delete error");
				};
				return;
				//cursor.continue();
			}
			else {
				cl("db: nothing to delete");
			}

		};
	},
	update_store_item: function(sname,num,nitem,callback) {
		var tx=idb.handle.transaction(sname,'readwrite');
		var store=tx.objectStore(sname);

		var kr=IDBKeyRange.bound(num,num,false,false);
		var req=store.openCursor(kr);

		req.onsuccess=function(event) {
			var cursor=event.target.result;
			if(cursor) {
				var oitem=cursor.value;
				var notreq=true;
				for(var k in oitem) {
					if(JSON.stringify(oitem[k])!=
					   JSON.stringify(nitem[k])) {
						oitem[k]=nitem[k];
						cl("idb: modified "+k);
						notreq=false;
					}
				}
				if(notreq) {
					return;
				}
				var res=cursor.update(nitem);
				res.onsuccess=function(event) {
					cl("idb: updated cursor");
					if(callback!==undefined)
						callback(event);
				};
				res.onerror=function(error) {
					cl("idb: cursor update error");
				};
				return;
				//cursor.continue();
			}
			else {
				var addreq=store.add(nitem,num);
				addreq.onsuccess=function(event) {
					cl("idb: added (update mode) key "+num);
					if(callback!==undefined)
						callback(event);
				}
				addreq.onerror=function(error) {
					cl("idb: error add (update mode)");
				};
			}

		};
	},
	get_store_items: function(sname,callback,low,up,rev) {
		// if low and up are undefined, all items are considered
		var kr;
		var last=false;
		var reversed=false;
		if((low!==undefined)&&(up!==undefined)) {
			if((low===0)&&(up<0)) {
				// get last up items
				last=true;
			}
			else if((low===0)&&(up===0)) {
				// get all items in reversed order
				// no key range, no stop criteria required!
				reversed=true;
			}
			else {
				// get items in range
				kr=IDBKeyRange.bound(low,up,true,true);
			}
		}
		else if (low!==undefined) {
			// get items from low to current
			kr=IDBKeyRange.lowerBound(low,true);
		}
		else if (up!==undefined) {
			// get items from first to up
			kr=IDBKeyRange.upperBound(up,true);
		}
		// overwrite reverse
		if(rev!==undefined)
			reversed=rev;

		var tx=idb.handle.transaction(sname,'readonly');
		var store=tx.objectStore(sname);

		var obj={};
		obj.cnt_objs=0;

		if(last||reversed) {
			if(kr!==undefined)
				var req=store.openCursor(kr,"prev");
			else
				var req=store.openCursor(null,"prev");
		}
		else {
			if(kr!==undefined)
				var req=store.openCursor(kr);
			else
				// get all items
				var req=store.openCursor();
		}

		req.onerror=function(error) {
			cl("idb: cursor error - "+error);
		};
		req.onsuccess=function(event) {
			var cursor=event.target.result;
			if(cursor&&(!(last&&(obj.cnt_objs==-up)))) {
				obj[cursor.key]=cursor.value;
				obj.cnt_objs+=1;
				cursor.continue();
			} else {
				delete obj.cnt_objs;
				callback(obj);
			}
		};
	},
	get_item_by_key: function(sname,key,callback) {
		var tx=idb.handle.transaction(sname,'readonly')
		var store=tx.objectStore(sname);
		var req=store.get(key);
		req.onerror=function(event) {
			cl("idb: get key error - "+event.target.errorCode);
		}
		req.onsuccess=function(event) {
			if(event.target.result!=null) {
				callback(event.target.result);
			}
		}
	},
	get_item_by_index: function(sname,index,val,callback) {
		var tx=db.handle.transaction(sname,'readonly')
		var store=tx.objectStore(sname);
		var idx=store.index(index);
		var req=idx.get(val);
		req.onerror=function(event) {
			cl("db: error! "+event.target.errorCode);
		}
		req.onsuccess=function(event) {
			if(event.target.result!=null) {
				callback(event.target.result);
			}
		}
	},
	del_item_by_key: function(sname,key,callback) {
		var tx=idb.handle.transaction(sname,'readwrite');
		var store=tx.objectStore(sname);

		var kr=IDBKeyRange.bound(key,key,false,false);
		var req=store.openCursor(kr);

		req.onsuccess=function(event) {
			var cursor=event.target.result;
			if(cursor) {
				var res=cursor.delete();
				res.onsuccess=function(event) {
					cl("idb: deleted key "+key);
					callback(event);
				};
				res.onerror=function(error) {
					cl("idb: cursor delete error");
				};
			}
			else {
				cl('idb: nothing to delete');
			}

		};
	},
	del: function(callback) {
		var req=indexedDB.deleteDatabase(idb.name);
		req.onsuccess=function() {
			cl("idb: deleted database '"+idb.name+"'");
			callback();
		};
		req.onblocked=function() {
			cl("idb: database delete blocked");
		};
		req.onerror=function() {
			cl("idb: delete database error");
		};
	}
};

