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
 * cashreg - simple cash register application
 *
 * author: frank@cashreg.org
 *
 */

var appstart = (new Date()).toString().replace(/GMT.*/,"");

// database 

// select indexed db (idb)
var db = idb;

// stores and initial content
var db_stores_and_content = {
	log: {
		keyname: true,
		keytype: 'autoIncrement'
	},
	bons: {
		keyname: true,
		keytype: 'autoIncrement',
		content: {
			1: [
				{
					'date': appstart,
					'billid': 0,
					'balance': 0,
					'groups': null
				}
			]
		}
	},
	bills: {
		keyname: true,
		keytype: 'autoIncrement'
	},
	products: {
		keyname: true,
		keytype: 'autoIncrement',
		content: {
			1: config.products
		}
	},
	orders: {
		keyname: true,
		keytype: 'autoIncrement'
	},
	groups: {
		keyname: true,
		keytype: 'autoIncrement',
		content: {
			1: config.groups
		}
	},
	map: {
		keyname: true,
		keytype: 'autoIncrement',
		content: {
			1: config.map
		}
	},
	dbsync: {
		keyname: true,
		keytype: 'autoIncrement',
		content: {
			1: config.dbsync
		}
	},
	config: {
		keyname: true,
		keytype: 'autoIncrement',
		content: {
			1: config.config
		}
	}
}

// logging

function log(type,text,callback,obj) {
	var date=(new Date()).toString();
	var item={
		date: date,
		type: type,
		text: text
	};
	if(obj!==undefined)
		item.obj=obj;
	db.add_store_item('log',item,function() {
		cl("log ("+type+") stored");
		if(callback!==undefined)
			callback();
	});
}

// dbsync - sync between idb and couchdb

var dbsync = {
	host: "",
	port: 0,
	type: "",
	href: "",
	prefix: "",
	show: "",
	set: function(event) {
		var dbval=$('#config_sync_server').val();
		var dbparts=dbval.split(":");
		var item={};
		item.type=dbparts[0];
		item.host=dbparts[1].replace(/\//g,"");
		item.port=parseInt(dbparts[2].replace(/\//g,""));
		item.prefix=$('#config_sync_prefix').val();
		db.get_store_items('dbsync',function(si) {
			for(var last in si);
			item.date=(new Date()).toString();
			var l=parseInt(last);
			db.add_store_item('dbsync',item,
			                     function() {
				log('dbsync_change',
				    "new dbsync settings: "+
				    dbval+", "+item.prefix,
				    function() {
					setTimeout(function() {
						bill.draw_dbsync();
					},100);
				});
			});
		},0,-1);
	},
	// generic interface - idb to couchdb
	sync_idb_couchdb: function(idb_store,couchdb_db) {
		var store=idb_store;
		var cdb="_cashreg_"+store;
		if(couchdb_db!==undefined)
			cdb="_cashreg_"+couchdb_db;
		var lnk=dbsync.href+dbsync.prefix+
		        cdb+"/_all_docs?limit=0";
		couchdb.cdb_xhr('GET',lnk,null,function(obj) {
			db.get_store_items(store,function(item) {
				for(var i in item) {
					var ln=dbsync.href+
					       dbsync.prefix+cdb+"/"+i;
					couchdb.cdb_xhr('PUT',ln,item[i]);
				}
			},obj.total_rows+1);
		});
	},
	// generic interface - in
	couchdb_sync_in: function(store,key,callback) {
		if(key<=0) {
			var req="_all_docs?limit=0";
		}
		else {
			var req=key;
		}
		var link=dbsync.href+dbsync.prefix+
		         "_cashreg_"+store+"/"+req;
		couchdb.cdb_xhr('GET',link,null,function(obj) {
			callback(obj);
		});
	},
	// generic interface - out
	couchdb_sync_out: function(store,key,data,callback) {
		if(key<=0) {
			return;
		}
		var link=dbsync.href+dbsync.prefix+
		         "_cashreg_"+store;
		couchdb.cdb_xhr('PUT',link,null,function() {
			couchdb.cdb_xhr('PUT',link+"/"+key,data,callback);
		});
	},
	sync: function() {
		switch(dbsync.type) {
			case 'couchdb':
				// logs
				couchdb.cdb_xhr('PUT',
				                dbsync.href+dbsync.prefix+
				                '_cashreg_log',
				                null,
				                function() {
					dbsync.sync_idb_couchdb('log');
				});
				// payed bills
				couchdb.cdb_xhr('PUT',
				                dbsync.href+dbsync.prefix+
				                '_cashreg_bills',
				                null,
				                //dbsync.couchdb_bills);
				                function() {
					dbsync.sync_idb_couchdb(
						'bills'
					);
				});
				// bons
				couchdb.cdb_xhr('PUT',
				                dbsync.href+dbsync.prefix+
				                '_cashreg_bons',
				                null,
				                //dbsync.couchdb_bons);
				                function() {
					dbsync.sync_idb_couchdb('bons');
				});
				break;
			default:
				cl("db type "+dbsync.type+" unknown!");
		}
	},
	interval: 0,
	startsync: function() {
		db.get_store_items('dbsync',function(dbs) {
			for(var k in dbs) {
				dbsync.host=dbs[k].host;
				dbsync.port=dbs[k].port;
				dbsync.type=dbs[k].type;
				dbsync.show=dbsync.type+"://"+dbsync.host+":"+
				         dbsync.port+"/";
				dbsync.href="http://"+dbsync.host+":"+
				         dbsync.port+"/";
				dbsync.prefix=dbs[k].prefix;
			}
			dbsync.interval=setInterval(dbsync.sync,5*60*1000);
		},0,-1);
	}
}

// groups

var groups = {
	items: {}
}

// numpad

var numpad = {
	init: function() {
		numpad.draw();
	},
	admin_init: function() {
		numpad.drawadmin();
	},
	draw: function() {
		$("#numpadwin").css('display','block');
		$("#numpadadminwin").css('display','none');
		this.drawnums();
	},
	drawadmin: function() {
		$("#numpadwin").css('display','none');
		$("#numpadadminwin").css('display','block');
		var html=""
		// add z bon button
		html=html+"<button id=numpad_admin_xprint>"+XBONBTN+"</button>";
		html=html+"<button id=numpad_admin_zprint>"+ZBONBTN+"</button>";
		$('.numpad_admin_bon').html(html);
		// events
		$('#numpad_admin_zprint').click(function(event) {
			numpad.modalzprint('zbon');
		});
		$('#numpad_admin_xprint').click(function(event) {
			numpad.adminzprint('xbon');
		});
	},
	modalzprint: function(bontype) {
		var buttons={};
		buttons[ZBONNACK]=function() {
			$(this).dialog("close");
		};
		buttons[ZBONACK]=function() {
			numpad.adminzprint(bontype);
			$(this).dialog("close");
		};
		$('#dialog').dialog({
			modal: true,
			title: "Z-Bon",
			position: ['center',10],
			buttons: buttons
		});
		$('#dialog').dialog("open");
		$('.ui-dialog').css('background-color','white');
		$('.ui-dialog-titlebar-close').html('&#10007;');
		$('#dialog').html(ZBONMODAL);
		var cnt=0;
		$('.ui-button').each(function() {
			if(cnt==1)
				this.style["background-color"]='red';
			cnt+=1;
		});
	},
	adminzprint: function(bontype) {
		// print xbon
		if(bontype=="xbon") {
			payedbills.printbon(bontype);
			tabnav.toggle_adminmode();
			return;
		}
		// add balancing cash transfer
		var bill={};
		bill[0]={};
		bill[0].name="Transfer";
		bill[0].pid=-1;
		bill[0].gid=-1;
		bill[0].tax=0;
		bill[0].discount=0;
		bill[0].brutto=payedbills.zbon.transfer;
		bill[0].date=payedbills.zbon.date;
		payedbills.add_bill(bill,payedbills.zbon.transfer,false);
		// add zbon to database
		payedbills.zbon.billid+=1;
		db.add_store_item('bons',payedbills.zbon,function(event) {
			// print zbon
			payedbills.printbon(bontype);
			// exit admin ui
			setTimeout(function() {
				tabnav.toggle_adminmode();
			},100);
		});
	},
	drawnums: function() {
		var nums="789456123C0.";
		var html="";
		nums.split("");
		for(var i=0;i<nums.length;i++) {
			html=html+this.drawbtn(nums[i]);
		}
		$("div.numpad_keys").html(html);
		$(".numpad_btn").click(function(event) {
			numpad.numpress(this);
		});
	},
	drawgroups: function() {
		db.get_store_items('groups',function(items) {
			// store in global groups object, TODO: improve!
			groups.items=items;
			// draw
			var html="";
			var cnt=0;
			var col=1;
			var width=98;
			var space=false;

			html=html+"<button id='numpad_plus_btn'>"+INSERT+
				  "</button>";
			html=html+"<button id='numpad_minus_btn'>"+DRAW+
				  "</button>";
			for(var i in items) {
				var a=numpad.drawgbtn(items[i].name,i);
				html=html+a;
				cnt++;
			}
			if(cnt+2>4) {
				col=2;
				width=47;
			}
			var div=Math.floor((cnt+2)/2);
			if(div*col<cnt+2) {
				div+=1;
			}
			var height=100/div-2;
			// admin btn
			$("div.numpad_groups").html(html);
			// modify width, height and button events
			var cssobj={"height":height+"%"};
			$(".numpad_gbtn").css(cssobj);
			$("#numpad_gbtn_space").css(cssobj);
			$("#numpad_admin_btn").css(cssobj);
			$("#numpad_plus_btn").css(cssobj);
			$("#numpad_minus_btn").css(cssobj);
			cssobj={"width":width+"%"};
			$(".numpad_gbtn").css(cssobj);
			$("#numpad_gbtn_space").css(cssobj);
			$("#numpad_admin_btn").css(cssobj);
			$("#numpad_plus_btn").css(cssobj);
			$("#numpad_minus_btn").css(cssobj);
			$(".numpad_gbtn").click(function(event) {
				numpad.gpress(this);
			});
			$("#numpad_plus_btn").click(function(event) {
				numpad.pmpress(this);
			});
			$("#numpad_plus_btn").attr('name','plus');
			$("#numpad_minus_btn").click(function(event) {
				numpad.pmpress(this);
			});
			$("#numpad_minus_btn").attr('name','minus');
		});
	},
	drawbtn: function(val) {
		var btn="<div class='numpad_key'>"+
		        "<button type='button' class='numpad_btn' "+
		        "value='"+val+"'>"+val+"</button></div>"
		return btn;
	},
	drawgbtn: function(name,val) {
		var tagval="value='"+val+"' ";
		var tagname="name='"+name+"' ";
		var btn="<button type='button' class='numpad_gbtn' "+
		        tagval+tagname+">"+val+": "+name+"</button>";
		return btn;
	},
	newnum: true,
	numpress: function(context) {
		var num=$(context).attr("value");
		switch(num) {
			case 'C':
				$("#numpad_display").val("");
				this.newnum=true;
				break;
			default:
				if(this.newnum) {
					$("#numpad_display").val("");
				}
				var onum=$("#numpad_display").val();
				var dotindex=onum.indexOf('.');
				if(dotindex!==-1) {
					if(num=='.') {
						return;
					}
					if(onum.length>dotindex+2) {
						return;
					}
				}
				$("#numpad_display").val(onum+num);
				this.newnum=false;
		}
	},
	gpress: function(context) {
		var name=$(context).attr("name");
		var gid=$(context).attr("value");
		var brutto=Number($("#numpad_display").val());
		db.get_item_by_key('groups',parseInt(gid),function(res) {
			cl(res);
			var gtax=res.tax;
			var gdiscount=res.discount;
			var gdiscround=res.discround;
			var p={};
			p.gid=parseInt(gid);
			p.tax=gtax;
			p.discount=gdiscount;
			p.discround=gdiscround;
			p.brutto=brutto;
			p.name=MANUAL_INPUT;
			//bill.add_item(p);
			// add to orders list first!
			var nprod=p;
			nprod.pid=-1; // by definition
			nprod.odate=(new Date()).toString().replace(/GMT.*/,"");
			nprod.sdate="";
			nprod.table=map.selected_table;
			nprod.state="ip";
			db.add_store_item('orders',nprod,function() {
				setTimeout(function() {
					orders.draw();
				},100);
			});
		});
		numpad.newnum=true;
	},
	pmpress: function(context) {
		var pm=$(context).attr("name");
		var brutto=Number($("#numpad_display").val());
		var pname=INSERT;
		if(pm=='minus') {
			brutto=-brutto;
			pname=DRAW;
		}
		var p={};
		p.gid=0;
		p.tax=0;
		p.discount=0;
		p.brutto=brutto;
		p.name=pname;
		bill.add_item(p);
		numpad.newnum=true;
	}
}

// bill

var bill = {
	init: function() {
		$('#billwin').css('display','block');
		$('#configwin').css('display','none');
		$('#preconfigwin').css('display','none');
		bill.draw();
	},
	config_draw: function() {
		// dbsync setup
		bill.draw_dbsync();
		// config setup
		bill.draw_config();
	},
	config_init: function() {
		$('.config_btn').click(function() {
			switch(this.name) {
			case "db":
				dbsync.set();
				break;
			case "conf":
				bill.set_config();
				break;
			}
		});
		$('#admin_deldb').click(function(event) {
			alert("Disabled on productive environment!");
			return;
			db.del();
			tabnav.toggle_adminmode();
		});
		$('.admin_dbdbg').click(function(event) {
			var action=event.target.name;
			var store="";
			var lev="";
			switch(action) {
			case "p":
				store="products";
				lev=4;
				break;
			case "o":
				store="orders";
				lev=4;
				break;
			case "b":
				store="bills";
				lev=4;
				break;
			case "z":
				store="bons";
				lev=4;
				break;
			case "g":
				store="groups";
				lev=4;
				break;
			case "m":
				store="map";
				lev=4;
				break;
			case "c":
				store="config";
				lev=4;
				break;
			case "d":
				store="dbsync";
				lev=4;
				break;
			case "l":
				store="log";
				lev=4;
				break;
			}
			db.get_store_items(store,function(item) {
				newdbg(item);
			});
		});
		$('.admin_sync').click(function(event) {
			var store="";
			var dir="";
			switch(event.target.name) {
				case 'pullt':
					store="map";
					dir="in";
					break;
				case 'pusht':
					store="map";
					dir="out";
					break;
				case 'pullp':
					store="products";
					dir="in";
					break;
				case 'pushp':
					store="products";
					dir="out";
					break;
				case 'pullg':
					store="groups";
					dir="in";
					break;
				case 'pushg':
					store="groups";
					dir="out";
					break;
				case 'pullc':
					store="config";
					dir="in";
					break;
				case 'pushc':
					store="config";
					dir="out";
					break;
			}
			if(dbsync.type!="couchdb") {
				cl("db type "+dbsync.type+" unknown!");
				return;
			}
			if(dir=='in') {

			dbsync.couchdb_sync_in(store,0,function(ret) {
				var tot=ret.total_rows;
				var cfunc=function(i) {
					return function() {
						dbsync.couchdb_sync_in(
							store,i,function(o) {

				var no={};
				for(var k in o) {
					if(k.slice(0,1)!='_')
						no[k]=o[k];
				}
				db.update_store_item(
					store,i,no,function() {
						if(store=='groups') {
							// to update global var
							numpad.drawgroups();
						}
						if((store=='groups')||
						   (store=='products')||
						   (store=='config')) {
							log(store+'_load',
							    "new "+store+
							    " loaded",
							    null,
							    no);
						}
						return;
					}
				);
							
							}
						);
							
					};
				};
				for(var i=1;i<=tot;i++) {
					(cfunc(i))();
				}
				tabnav.toggle_adminmode();
			});

			}
			else {

			db.get_store_items(store,function(items) {
				for(var key in items) {
					dbsync.couchdb_sync_out(
						store,key,items[key],
					        function(event) {
							return;
						}
					);
				}
				tabnav.toggle_adminmode();
			});

			}
		});
		bill.config_draw();
	},
	draw_config: function() {
		db.get_store_items('config',function(con) {
			for(var last in con) {
				var name=con[last].name;
				var street=con[last].street;
				var city=con[last].city;
				var tel=con[last].tel;
				var tid=con[last].tid;
				var currency=con[last].currency;
				var bufval=con[last].bufval;
				RNAME=name;
				STREET=street;
				CITY=city;
				TEL=tel;
				TID=tid;
				CURRENCY=currency;
				BUFVAL=parseInt(bufval);
				$('#config_rname').val(html2ascii(name));
				$('#config_street').val(html2ascii(street));
				$('#config_city').val(html2ascii(city));
				$('#config_tel').val(html2ascii(tel));
				$('#config_tid').val(html2ascii(tid));
				$('#config_currency').val(currency);
				$('#config_bufval').val(bufval);
			}
		},0,-1);
	},
	set_config: function() {
		var con={}
		con.name=ascii2html($('#config_rname').val());
		con.street=ascii2html($('#config_street').val());
		con.city=ascii2html($('#config_city').val());
		con.tel=ascii2html($('#config_tel').val());
		con.tid=ascii2html($('#config_tid').val());
		con.currency=$('#config_currency').val();
		con.bufval=$('#config_bufval').val();
		RNAME=con.name;
		STREET=con.street;
		CITY=con.city;
		TEL=con.tel;
		TID=con.tid;
		CURRENCY=con.currency;
		BUFVAL=con.bufval;
		db.get_store_items('config',function(item) {
			for(var last in item);
			con.date=(new Date()).toString();
			db.add_store_item('config',con,function() {
				log('config_change',
				    "version "+last+" modified",function() {
					setTimeout(function() {
						bill.draw_config();
					},100);
				 });
			});
		},0,-1);
	},
	draw_dbsync: function() {
		db.get_store_items('dbsync',function(dbs) {
			for(var last in dbs);
			dbsync.host=dbs[last].host;
			dbsync.port=dbs[last].port;
			dbsync.type=dbs[last].type;
			dbsync.prefix=dbs[last].prefix;
			dbsync.show=dbsync.type+"://"+dbsync.host+":"+
			            dbsync.port+"/";
			dbsync.href="http://"+dbsync.host+":"+dbsync.port+"/";
			$('#config_sync_server').val(dbsync.show);
			$('#config_sync_prefix').val(dbsync.prefix);
		},0,-1);
	},
	draw: function(mode) {
		var cbill=null;
		var html="";
		var sum_tax={};
		var sum_brutto=0;
		var first=true;

		if(mode=='info') 
			cbill=this.old;
		else
			cbill=this.current;

		for(var item in cbill) {
			if(cbill[item]==null) {
				continue;
			}

			// product
			var np="<div class=bill_list_entry id="+item+">";

			// product / id
			np=np+"<div class='bill_list_product'>"+
			   cbill[item].name+"</div>";
			// group
			np=np+"<div class='bill_list_group'>"+
			   cbill[item].gid+"</div>";
			// brutto
			np=np+"<div class='bill_list_brutto'>"+
			   cbill[item].brutto.toFixed(2)+"</div>";

			// discount
			var rb=cbill[item].brutto;
			if(cbill[item].discount!=0) {
				var disc=rb*cbill[item].discount/100.0;
				if(cbill[item].discround!==undefined) {
					var dround=cbill[item].discround;
					var drndmult=Math.pow(10,dround);
					if(rb>0)
					disc=Math.floor(disc*drndmult)/drndmult;
					else
					disc=Math.ceil(disc*drndmult)/drndmult;
				}
				var dval=disc*100/rb;
				rb-=disc;
				np=np+"<div class='bill_list_wscl'></div>";
				np=np+"<div class='bill_list_disctax'>"+
				   DISCOUNT+"</div>";
				np=np+"<div class='bill_list_dtval'>"+
				   dval.toFixed(1)+"%</div>";
				np=np+"<div class='bill_list_dtres'>"+
				      (-1*disc).toFixed(2)+"</div>";
				//np=np+"<div class='bill_list_ws'></div>";
			}

			// tax
			var tax=rb*cbill[item].tax/(cbill[item].tax+100.0);
			np=np+"<div class='bill_list_wscl'></div>";
			np=np+"<div class='bill_list_disctax'>"+TAX+"</div>";
			np=np+"<div class='bill_list_dtval'>"+
			   cbill[item].tax+"%</div>";
			np=np+"<div class='bill_list_dtres'>"+
			   tax.toFixed(2)+"</div>";
			//np=np+"<div class='bill_list_ws'></div>";
			if(sum_tax[cbill[item].tax]==null) {
				sum_tax[cbill[item].tax]=0;
			}
			// sum tax, only if ours >= 0
			if((cbill[item].gid<=0)||
			   (groups.items[cbill[item].gid].ours>=0))
				sum_tax[cbill[item].tax]+=tax;

			np=np+"</div>";

			html=np+html

			// sum, only if ours >= 0
			if((cbill[item].gid<=0)||
			   (groups.items[cbill[item].gid].ours>=0))
				sum_brutto+=rb;
		}
		$("div.bill_list").html(html);

		// event handling and colors
		$('div.bill_list_entry').each(function() {
			var id=$(this).attr('id');
			if(id%2)
				$(this).css('background-color','#bbb');
			if((mode==="info")&&(id in bill.storno_list))
				$(this).css('background-color','red');
		});

		if(mode!='info') {
			$('div.bill_list_entry').click(function(event) {
				bill.cancel($(this).attr('id'));
			});
		}
		else {
			$('div.bill_list_entry').click(function(event) {
				bill.add_storno_item($(this).attr('id'));
			});
		}

		// total
		var e=$('div.bill_total_sum');
		//html="Total = <b>"+sum_brutto.toFixed(2)+"</b><br>Tax ";
		html="<b>"+sum_brutto.toFixed(2)+"</b>";
		var tt="";
		var tv="";
		for(var tax in sum_tax) {
			tt=tt+" "+tax+"% /";
			tv=tv+" "+sum_tax[tax].toFixed(2)+' /'
		}
		tt=tt.replace(/\/$/,"");
		tv=tv.replace(/\/$/,"");
		//html=html+tt+"= "+tv;
		e.html(html);
		bill.thtml=html;
		e.css({
			'line-height': e.height()+"px",
			'font-size': e.height()*0.75+"px"
		});
		bill.current_sum=sum_brutto;

		// total function buttons
		if(mode!='info') {
			// pay
			e=$('div.bill_total_fn0');
			e.html("<button id='bill_pay_btn'>"+PAYBILL+
			       "</button>");
			$('#bill_pay_btn').click(function(event) {
				bill.pay(event);
			});
			e=$('div.bill_total_fn1');
			e.html("<button id='bill_payv_btn'>"+PAYVOUCH+
			       "</button>");
			$('#bill_payv_btn').click(function(event) {
				bill.pay_vouch(event);
			});
			$('div.bill_total_fn2').html("");
		}
		else {
			var scnt=objsize(bill.storno_list);
			e=$('div.bill_total_fn2');
			if(scnt==0) {
				html="<button id='bill_storno_btn'>Back"+
				     "</button>"
				e.html(html);
				e=$('#bill_storno_btn');
				e.click(function(event) {
					bill.draw();
				});
				e.css('background-color','white');
			}
			else {
				html="<button id='bill_storno_btn'>Storno"+
				     "</button>"
				e.html(html);
				e=$('#bill_storno_btn');
				e.click(function(event) {
					bill.storno(event);
				});
				e.css('background-color','red');
			}
			e=$('div.bill_total_fn0');
			e.html("<button id='bill_print_btn'>Bill</button>");
			$('#bill_print_btn').click(function(event) {
				bill.print(event);
			});
			e=$('div.bill_total_fn1');
			e.html("<button id='bill_receipt_btn'>Receipt</button>");
			$('#bill_receipt_btn').click(function(event) {
				bill.print(event,true);
			});
		}
	},
	//add_item: function(gid,gtax,gdiscount,brutto,pname,pid) {
	add_item: function(nprod) {
		// sanity check
		if((nprod===undefined)||(nprod===null)) {
			var amsg="Something is wrong, tyring to transfer "+
			         "'nothing'! Please tell your boss! Thanks!"
			alert(amsg);
			return;
		}
		if((nprod.gid===undefined)||
		   (nprod.tax===undefined)||
		   (nprod.discount===undefined)||
		   (nprod.brutto===undefined)||
		   (nprod.name===undefined)) {
			var amsg="Trying to transfer an invalid item! "+
			         "Please tell your boss! Thanks!";
			alert(amsg);
			return;
		}
		if(isNaN(nprod.brutto)||
		   isNaN(nprod.discount)||
		   isNaN(nprod.tax)) {
			var amsg="Trying to transfer invalid numbers! "+
			         "Please tell your boss! Thanks!";
			alert(amsg);
			return;
		}
		var cbill=bill.current;
		var bs=objsize(cbill);
		var cprod=cbill[bs]=clone(nprod);
		cprod.date=(new Date()).toString().replace(/GMT.*/,"");
		bill.draw();
	},
	del_item: function(inum) {
		var cbill=bill.current;
		var bs=objsize(cbill);
		if(bs==0||inum<0) return;
		for(var item=inum;item<(bs-1);item++) {
			cbill[item]=cbill[item+1];
		}
		delete cbill[bs-1];
		bill.draw();
	},
	cancel: function(id) {
		var cbill=bill.current;
		var inum=parseInt(id);
		if(cbill[inum].odate!=null)
			orders.inject_item(cbill[inum]);
		bill.del_item(inum);
	},
	add_storno_item: function(id) {
		if(id in bill.storno_list)
			delete bill.storno_list[id];
		else
			bill.storno_list[id]=true;
		bill.draw('info');
	},
	pay: function(event) {
		if(objsize(bill.current))
			payedbills.add_bill(bill.current,bill.current_sum,true);
		else
			bill.open(); // open drawer without adding a bill
	},
	open: function(event) {
		//if(typeof cordova != "undefined")
		//	cordova.plugins.epos.discover_and_open(DRAWERNUM);
	},
	pay_vouch: function(event) {
		if(!objsize(bill.current))
			return;
		var html=VOUCHAMOUNT+':';
		html+="<input type=number id=vouch value=0 min=0 max=999>";
		html+="<br><br>";
		var vbvals=[1,2,3,4,5,10,13,15,20,23,25,30,40,42,50,100];
		for(var vv in vbvals) {
			var btn="<div class=vvbtndiv>"+
			        "<button value="+vbvals[vv]+
			        " class=vouchvalbtn><br>"+vbvals[vv]+
			        "<br><br></button></div>";
			html+=btn;
		}
		var buttons={};
		buttons[VPAY]=function() {
			var val=parseInt($('#vouch').val());
			if(isNaN(val)) {
				alert("Not a number!");
				return;
			}
			payedbills.add_bill(bill.current,bill.current_sum,
			                    true,val);
			$('#dialog').dialog("close");
		};
		buttons[VCANCEL]=function() {
			$('#dialog').dialog("close");
		};
		$('#dialog').dialog({
			modal: true,
			title: "Voucher",
			position: ['center',10],
			buttons: buttons
		});
		$('#dialog').dialog("open");
		$('.ui-dialog').css('background-color','white');
		$('.ui-dialog-titlebar-close').html('&#10007;');
		$('#dialog').html(html);
		$('.vouchvalbtn').click(function(event) {
			var add=parseInt(event.target.value);
			var val=parseInt($('#vouch').val());
			$('#vouch').val(val+add);
		});
	},
	storno: function(event) {
		var storno={};
		var st_sum=0;
		bill.current={};
		bill.current_sum=0;
		var cnt=0;
		for(var item in bill.old) {
			// storno bill
			storno[item]=$.extend(true,{},bill.old[item]);
			storno[item].brutto=-bill.old[item].brutto;
			var rb=storno[item].brutto;
			if(storno[item].discount!=0) {
				var disc=rb*storno[item].discount/100.0;
				if(storno[item].discround!==undefined) {
					var dround=storno[item].discround;
					var drndmult=Math.pow(10,dround);
					if(rb>0)
					disc=Math.floor(disc*drndmult)/drndmult;
					else
					disc=Math.ceil(disc*drndmult)/drndmult;
				}
				var dval=disc*100/rb;
				rb-=disc;
			}
			if((storno[item].gid<=0)||
			   (groups.items[storno[item].gid].ours>=0))
				st_sum+=rb;
			// new bill
			if(!(item in bill.storno_list)) {
				bill.current[cnt]=$.extend(true,{},
				                           bill.old[item]);
				bill.current_sum+=bill.current[cnt].brutto
				cnt++;
			}
			else {
				// storno item back to orders list
				if(bill.old[item].odate!=null)
					orders.inject_item(bill.old[item]);
			}
		}
		if(bill.noncash!==undefined)
			payedbills.add_bill(storno,st_sum,false,-bill.ncval);
		else
			payedbills.add_bill(storno,st_sum,false);
		// reset
		bill.storno_list={};
		//bill.draw();
	},
	print: function(event,receipt) {
		if(typeof epos_print_addr !== "undefined") {
			cl("using epos print api ...");
			bill.print_epos(receipt,true);
		}
		else if(typeof cordova != "undefined") {
			bill.print_epos(receipt);
		}
		else {
			bill.print_html(receipt); 
		}
	},
	print_epos: function(receipt,printapi) {
		var str="";
		var date=bill.olddate;
		var dstr=date.substring(0,date.length-3);
		var ptddiff=PCHARS-TDIND;
		if(printapi!==undefined)
			str="\n"+RNAME+"\n";
		else
			str=RNAME+"\n";
		str+=STREET+"\n"+CITY+"\n"+TEL+"\n"+TID+"\n\n";
		str+=RECEIPT+"Nr.: "+bill.oldid+"\n"+dstr+"\n\n";
		str+=spt(html2ascii(PRODUCT),PCHARS)+
		     spad(html2ascii(CURRENCY),CCHARS)+"\n\n";
		var brutto={};
		var netto={};
		var tax={};
		var total=0;
		var tnetto=0;
		var ttax=0;
		for(var item in bill.old) {
			it=bill.old[item];
			if(brutto[it.tax]===undefined) {
				brutto[it.tax]=0;
			}
			if(netto[it.tax]===undefined) {
				netto[it.tax]=0;
			}
			if(tax[it.tax]===undefined) {
				tax[it.tax]=0;
			}
			str+=spt(html2ascii(it.name),PCHARS);
			str+=spad(it.brutto.toFixed(2),CCHARS)+"\n";
			//var rb=it.brutto*(1.0-it.discount/100.0);
			var rb=it.brutto;
			if(it.discount!=0) {
				str+=spt("",TDIND)+spt(DISCOUNT,ptddiff);
				//str+=spad(rb.toFixed(2),CCHARS)+"\n";
				var disc=it.brutto*it.discount/100.0;
				if(it.discround!==undefined) {
					var drnd=it.discround;
					var drmult=Math.pow(10,drnd);
					if(rb>0)
					disc=Math.floor(disc*drmult)/drmult;
					else
					disc=Math.ceil(disc*drmult)/drmult;
				}
				var dval=disc*100/rb;
				rb-=disc;
				str+=spad("-"+disc.toFixed(2),CCHARS)+"\n";
			}
			str+=spt("",TDIND)+spt(TAX+" "+it.tax+"%",ptddiff);
			var ctax=rb*it.tax/(it.tax+100.0);
			str+=spad(ctax.toFixed(2),CCHARS)+"\n";
			total+=rb;
			brutto[it.tax]+=rb;
			ttax+=ctax;
			tax[it.tax]+=ctax;
			tnetto+=(rb-ctax);
			netto[it.tax]+=(rb-ctax);
		}
		str+="\n";
		str+=spt(TAX,TSEP);
		str+=spt("Netto",TSEP);
		str+=spt(TAX,TSEP);
		str+=spt("Brutto",TSEP);
		str+="\n";
		str+=spt("[%]",TSEP)+spt("["+CURRENCY+"]",TSEP);
		str+=spt("["+CURRENCY+"]",TSEP)+spt("["+CURRENCY+"]",TSEP)+"\n";
		for(var t in brutto) {
			str+=spt(t,TSEP);
			str+=spt(netto[t].toFixed(2),TSEP);
			str+=spt(tax[t].toFixed(2),TSEP);
			str+=spt(brutto[t].toFixed(2),TSEP);
			str+="\n";
		}
		str+="\n";
		str+=spt(TOTAL,TSEP)+spt(tnetto.toFixed(2),TSEP);
		str+=spt(ttax.toFixed(2),TSEP)+
		     spt(total.toFixed(2),TSEP)+"\n";
		if(receipt) {
			str+="\n";
			str+="\n";
			str+="Angaben zum Nachweis der Höhe und der\n";
			str+="betrieblichen Veranlassung von Bewirtungs-\n";
			str+="aufwendungen (§ 4 Abs. 5 Nr. 2 EStG).\n";
			str+="\n";
			str+="Tag und Ort der Bewirtung siehe oben.\n";
			str+="\n";
			str+="Bewirtete Personen:\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="Anlass der Bewirtung:\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="_____________________________________\n";
			str+="\n";
			str+="\n";
			str+="Datum: ______________________________\n";
			str+="\n";
			str+="Ort: ________________________________\n";
			str+="\n";
			str+="\n";
			str+="Unterschrift: _______________________\n";
		}
		str=html2ascii(str);
		if(printapi!==undefined) {
			var data=epos_print_template.replace("THEBILL",str);
			var ao={
				url: epos_print_addr,
				type: 'POST',
				data: data,
				contentType: "text/xml",
				success: function(ret) {
					cl("epos print success: "+ret);
				},
				error: function(xhr,stat,err) {
					cl("epos print err: "+err);
				}
			};
			$.ajax(ao);
			//epos_print.print(str);
		}
		else {
			//alert(str);
			cordova.plugins.epos.discover_and_print(str);
		}
	},
	print_html: function(receipt) {
		var bwin=window.open("","Bill",'width=250,height=500');
		var html="<html><head><link rel=stylesheet type=text/css ";
		html=html+"href=css/bill.css></head><body>";
		html=html+"<div class=bon>"+BONHEAD;
		var date=bill.olddate;
		var dstr=date.substring(0,date.length-3);
		html=html+"<div class=head2>"+RECEIPT+
		          " Nr.: "+bill.oldid+"<br>"+dstr;
		html=html+"</div>";
		html=html+"<div class=total><hr></div>"
		html=html+"<div class=col1><b>"+PRODUCT+"</b></div>"
		html=html+"<div class=col2><b>"+CURRENCY+"</b></div>"
		var brutto={};
		var netto={};
		var tax={};
		var total=0;
		var tnetto=0;
		var ttax=0;
		for(var item in bill.old) {
			it=bill.old[item];
			if(brutto[it.tax]===undefined) {
				brutto[it.tax]=0;
			}
			if(netto[it.tax]===undefined) {
				netto[it.tax]=0;
			}
			if(tax[it.tax]===undefined) {
				tax[it.tax]=0;
			}
			html=html+"<div class=col1>";
			html=html+it.name;
			html=html+"</div>";
			html=html+"<div class=col2>";
			html=html+it.brutto.toFixed(2);
			html=html+"</div>";

			var rb=it.brutto;
			if(it.discount!=0) {
				html=html+"<div class=col1-1>&nbsp</div>";
				html=html+"<div class=col1-2>"+DISCOUNT+
				     "</div>";
				var disc=it.brutto*it.discount/100.0;
				if(it.discround!==undefined) {
					var drnd=it.discround;
					var drmult=Math.pow(10,drnd);
					if(rb>0)
					disc=Math.floor(disc*drmult)/drmult;
					else
					disc=Math.ceil(disc*drmult)/drmult;
				}
				var dval=disc*100/rb;
				rb-=disc;
				//html=html+"<div class=col2>"+rb.toFixed(2)+
				//     "</div>";
				html=html+"<div class=col2>-"+disc.toFixed(2)+
				     "</div>";
			}
			html=html+"<div class=col1-1>&nbsp</div>";
			html=html+"<div class=col1-2>"+TAX+" "+it.tax+"%</div>";
			var ctax=rb*it.tax/(it.tax+100.0);
			html=html+"<div class=col2>"+ctax.toFixed(2)+"</div>";
			html=html+"<div class=vspace></div>";
			total+=rb;
			brutto[it.tax]+=rb;
			ttax+=ctax;
			tax[it.tax]+=ctax;
			tnetto+=(rb-ctax);
			netto[it.tax]+=(rb-ctax);
		}
		html=html+"<div class=total><hr></div>"
		html=html+"<div class=tax1>"+TAX+" [%]</div>";
		html=html+"<div class=tax2>Netto ["+CURRENCY+"]</div>";
		html=html+"<div class=tax3>"+TAX+" ["+CURRENCY+"]</div>";
		html=html+"<div class=tax4>Brutto ["+CURRENCY+"]</div>";
		for(var t in brutto) {
			html=html+"<div class=tax1>"+t+"</div>";
			html=html+"<div class=tax2>"+netto[t].toFixed(2)+
			     "</div>";
			html=html+"<div class=tax3>"+tax[t].toFixed(2)+"</div>";
			html=html+"<div class=tax4>"+brutto[t].toFixed(2)+
			     "</div>";
		}
		html=html+"<div class=total><hr></div>"
		html=html+"<div class=tax1><b>"+TOTAL+"</b></div>";
		html=html+"<div class=tax2>"+tnetto.toFixed(2)+"</div>";
		html=html+"<div class=tax3>"+ttax.toFixed(2)+"</div>";
		html=html+"<div class=tax4><b>"+total.toFixed(2)+"</b></div>";
		if(receipt) {
			html=html+"<div class=total>";
			html=html+"<br>";
			html=html+"Angaben zum Nachweis der H&ouml;he und<br>";
			html=html+"der betrieblichen Veranlassung von<br>";
			html=html+"Bewirtungsaufwendungen<br>";
			html=html+"(§ 4 Abs. 5 Nr. 2 EStG).<br>";
			html=html+"<br>";
			html=html+"Tag und Ort der Bewirtung siehe<br>";
			html=html+"oben.<br>";
			html=html+"<br>";
			html=html+"Bewirtete Personen:<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"Anlass der Bewirtung:<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"______________________________<br>";
			html=html+"<br>";
			html=html+"<br>";
			html=html+"Datum: _______________________<br>";
			html=html+"<br>";
			html=html+"Ort: _________________________<br>";
			html=html+"<br>";
			html=html+"<br>";
			html=html+"Unterschrift: ________________<br>";
			html=html+"</div>";
		}
		html=html+"</div></body></html>";
		bwin.document.write(html);
		bwin.document.close();
		bwin.onload=function() {
			bwin.focus();
			//bwin.print();
			//bwin.close();
		};
	},
	current: {},
	current_sum: 0,
	old: {},
	oldid: 0,
	olddate: "",
	thtml: "",
	storno_list: {}
}

// payed bills

var payedbills = {
	init: function() {
		$("#bonswin").css('display','none');
		$("#payedbillswin").css('display','block');
	},
	draw_type: function(str,type) {
		var ret="<div class=payedbill_"+type+">"+
		        "<button class=payedbillbtn>"+str+"</button></div>";
		return ret;
	},
	draw: function() {
		var to=23;
		var from=3;
		var select=false;
		// select=$('...
		if(select!==true) {
			from=0;
			to=-100;
		}
		db.get_store_items('bills',function(items) {
			var html="";
			var low;
			var high;
			for(var i in items) {
				var num=parseInt(i);
				if(num<low || low===undefined)
					low=num;
				if(num>high || high===undefined)
					high=num;
			}
			for(var i=high;i>=low;i--) {
				var b=items[i];
				var bgc="#ccc";
				if(i%2)
					bgc="#ddd";
				html+="<div class=payedbill id="+i+" ";
				html+="style=background-color:"+bgc+";>";
				html+=payedbills.draw_type(zeropad(i,6),"id");
				var li=b.date.lastIndexOf(" ");
				html+=payedbills.draw_type(
					b.date.substring(0,li),"date"
				);
				html+=payedbills.draw_type(b.total.toFixed(2),
				                           "total");
				html+="</div>";
			}
			$('div#payedbillswin').html(html);
			$('div.payedbill').click(function(event) {
				payedbills.info(event,items);
			});
		},from,to);
	},
	draw_admin: function() {
		payedbills.draw_bon();
	},
	zbon: {},
	zhtml: "",
	epos: "",
	draw_blt: function(str,type) {
		var ret="<div class='payed_bills_admin_bon_list_"+type+"' "+
		                    "'std_margin'>"+str+"</div>";
		return ret;
	},
	draw_bon: function() {
		this.zbon.groups={};
		// initialize groups to have them in a fixed sequence
		var otax={};
		var obrutto={};
		for(var gid in groups.items) {
			var name=groups.items[gid].name;
			this.zbon.groups[name]={};
			var tax=groups.items[gid].tax;
			if(otax[tax.toString()]===undefined) {
				otax[tax.toString()]=0;
				obrutto[tax.toString()]=0;
			}
		}
		// prepare zbon - fill groups
		this.zbon.groups[INSERT]={};
		this.zbon.groups[DRAW]={};
		this.zbon.date=(new Date()).toString().replace(/GMT.*/,"");
		db.get_store_items('bons',function(bon) {
			var last=parseInt(Object.keys(bon)[0]);
			var from=bon[last].billid;
			var oldb=bon[last].balance;
			var deltab=0;
			var theirs=0;
			var ours=0;
			var noncash={};
			db.get_store_items('bills',function(bills) {
				var numbills=objsize(bills);
				var lbill=from;
				for(var i in bills) {
					var bill=bills[i].bill;
					for(var j in bill) {
						var it=bill[j]

				// work around, products not properly transfered
				if((it.gid===undefined)||
				   (it.tax===undefined)||
				   (it.discount===undefined)||
				   (it.brutto===undefined)||
				   (it.name===undefined)||
				   (it.tax===undefined)) {
					var amsg="Item "+j+" in bill "+i+
					         "was not properly transfered."+
					         " Please tell your boss!";
					alert(amsg);
					break;
				}

						var gid=it.gid;
						var add=it.brutto;
						if(it.discount!=0) {
							var disc=it.brutto*
							         it.discount/
							         100;
							if(it.discround!==
							   undefined) {
   if(add>0)
   disc=Math.floor(disc*Math.pow(10,it.discround))/Math.pow(10,it.discround);
   else
   disc=Math.ceil(disc*Math.pow(10,it.discround))/Math.pow(10,it.discround);
							}
							add-=disc;
						}
						var grp=payedbills.zbon.groups;
						var taxadd=add*it.tax/
						               (100+it.tax);
						var gst="";
						// insert or draw
						if(gid<=0) {
							if(add<0)
								gst=DRAW;
							else
								gst=INSERT;
						}
						else {
							var g=groups.items[gid];
							gst=g.name;
							if(g.ours==0) {
								theirs+=add;
							}
							if(g.ours==1) {
								ours+=add;
							}
						}
						if(grp[gst]===undefined)
							grp[gst]={};
						if(grp[gst].brutto===undefined)
							grp[gst].brutto=0;
						grp[gst].brutto+=add;
						if((gid==0)||
						   (groups.items[gid].ours>=0))
							deltab+=add;
						if(grp[gst].tax===undefined)
							grp[gst].tax=0;
						grp[gst].tax+=taxadd;

				// sums grouped by tax
				if(gid>0) {
					if(groups.items[gid].ours==1) {
						//cl("adding: "+taxadd+" "+add);
						otax[it.tax.toString()]+=taxadd;
						obrutto[it.tax.toString()]+=add;
					}
				}

					// list storno separately
					if((gid!=0)&&(add<0)) {
						gst=gst+" Storno";
						taxadd=-taxadd;
						add=-add;
						if(grp[gst]===undefined)
							grp[gst]={};
						if(grp[gst].brutto===undefined)
							grp[gst].brutto=0;
						grp[gst].brutto+=add;
						if(grp[gst].tax===undefined)
							grp[gst].tax=0;
						grp[gst].tax+=taxadd;
					}

					}
					lbill=i;
					// noncash, e.g. voucher
					if(bills[i].noncash!==undefined) {
						var ncb=bills[i];
						var ncn=ncb.noncash
						if(noncash[ncn]===undefined)
							noncash[ncn]=0;
						noncash[ncn]+=ncb.ncval;
						//ours-=ncval;
						deltab-=ncb.ncval;
					}
				}
				payedbills.zbon.billid=parseInt(lbill);
				var drw=payedbills.draw_blt;
				var html="";
				var epos="";
				// header / footer
				html=html+drw("Z-Bon Nr",'foot-s');
				html=html+drw(last,'foot-e');
				if(typeof epos_print_addr !== "undefined")
					epos+=spt("\nZ-Bon Nr:",16)+last+"\n";
				else
					epos+=spt("Z-Bon Nr:",15)+last+"\n";
				html=html+drw("Date",'foot-s');
				var di=payedbills.zbon.date.lastIndexOf(" ");
				var md=payedbills.zbon.date.substring(0,di);
				html=html+drw(md,'foot-e');
				epos+=spt("Date:",15)+md+"\n";
				html=html+drw("Last",'foot-s');
				di=bon[last].date.lastIndexOf(" ");
				md=bon[last].date.substring(0,di);
				html=html+drw(md,'foot-e');
				epos+=spt("Last:",15)+md+"\n\n";
				html=html+drw("<hr>",'foot-s');
				html=html+drw("<hr>",'foot-e');
				// groups
			    	html=html+drw("<b>Group</b>","group");
			    	html=html+drw("<b>Brutto</b>","brutto");
			    	html=html+drw("<b>Tax</b>","tax");
				epos+=spt("Group",20)+spt("Brutto",10)+"Tax\n";
				for(var gid in payedbills.zbon.groups) {
					var grp=payedbills.zbon.groups[gid];
					if(grp.brutto===undefined)
						continue;
					html=html+
					     drw(gid,"group")+
					     drw(grp.brutto.toFixed(2),
					         "brutto")+
					     drw(grp.tax.toFixed(2),"tax");
					epos+=spt(gid,20)+
					      spt(grp.brutto.toFixed(2),10)+
					      spt(grp.tax.toFixed(2),10)+"\n";
					
				}
				payedbills.zbon.balance=oldb+deltab;
				// preliminary total
				html=html+drw("<hr>",'foot-s');
				html=html+drw("<hr>",'foot-e');
				epos+="\n";
				html=html+"<div width=100%>";
				html=html+RUNTOT+": "+oldb.toFixed(2)+
				     " + "+deltab.toFixed(2)+
				     " = "+payedbills.zbon.balance.toFixed(2);
				html=html+"</div>";
				epos+=RUNTOT+": "+oldb.toFixed(2)+" + "+
				      deltab.toFixed(2)+" = "+
				      payedbills.zbon.balance.toFixed(2)+"\n";
				html=html+drw("<hr>",'foot-s');
				html=html+drw("<hr>",'foot-e');
				epos+="\n";
				// outside capital
				if(theirs!=0) {
					html=html+"<div width=100%>";
					html=html+OUTSIDE+": "+
					     theirs.toFixed(2);
					html=html+"</div>";
					epos+=OUTSIDE+": "+
					      theirs.toFixed(2)+"\n";
					payedbills.zbon.balance-=theirs;
				}
				// sales volume
				html=html+"<div width=100%>";
				html=html+OWNSALES+": "+ours.toFixed(2);
				html=html+"</div>";
				epos+=OWNSALES+": "+ours.toFixed(2)+"\n";
				for(var tax in otax) {
					html=html+"<div width=100%>";
					html=html+" - "+tax+"%: "+
					          obrutto[tax].toFixed(2)+" / "+
					          otax[tax].toFixed(2);
					html=html+"</div>";
					epos+=" - "+tax+"%: "+
					      obrutto[tax].toFixed(2)+" / "+
					      otax[tax].toFixed(2)+"\n";
				}
				// noncash
				for(ncn in noncash) {
					html=html+"<div width=100%>";
					html+=NONCASH[ncn]+": "+
					      noncash[ncn].toFixed(2);
					html=html+"</div>";
					epos+=NONCASH[ncn]+": "+
					      noncash[ncn].toFixed(2)+"\n";
				}
				// savings
				html=html+"<div width=100%>";
				var save=payedbills.zbon.balance-BUFVAL;
				html=html+SAVINGS+": "+save.toFixed(2);
				html=html+"</div>";
				epos+=SAVINGS+": "+save.toFixed(2);
				// new balance value
				payedbills.zbon.balance-=save;
				// store transfer value
				payedbills.zbon.transfer=-(save+theirs);
				// store printable version
				payedbills.zhtml=html;
				payedbills.epos=html2ascii(epos);
				// draw
				$('#bonwin').html(html);
			},from+1); // skip last bon
		},0,-1); // only get last item, i.e zbon!
	},
	printbon: function(bt) {
		var epos=payedbills.epos;
		var zhtml=payedbills.zhtml;
		if(bt=="xbon") {
			 epos=payedbills.epos.replace("Z-Bon","X-Bon");
			 zhtml=payedbills.zhtml.replace("Z-Bon","X-Bon");
		}
		if(typeof epos_print_addr !== "undefined") {
			cl("using epos print api ...");
			epos=epos+"\n";
			var data=epos_print_template.replace("THEBILL",epos);
			var ao={
				url: epos_print_addr,
				type: 'POST',
				data: data,
				ontentType: "text/xml",
				success: function(ret) {
					cl("epos print success: "+ret);
				},
				error: function(xhr,stat,err) {
					cl("epos print err: "+err);
				}
			};
			$.ajax(ao);
		}
		else if(typeof cordova != "undefined") {
			//cordova.plugins.epos.discover_and_print(epos);
			cl("not printing anything ...");
		}
		else {
			var btstr="Z-Bon";
			if(bt=="xbon") btstr="X-Bon";
			var zwin=window.open('',btstr,'width=300,height=500');
			var header="<html><head>";
			header=header+"<link rel=\"stylesheet\" "+					              "type=\"text/css\" "+
			              "href=\"css/cashreg.css\">";
			header=header+"</head><body>";
			var footer="</body></html>";
			zwin.document.write(header+zhtml+footer);
			zwin.document.close();
			zwin.onload=function() {
				zwin.focus();
				zwin.print();
				zwin.close();
			};
		}
		cl("printing bon at "+payedbills.zbon.date);
	},
	add_bill: function(thebill,total,del,noncash) {
		var item={};
		item.date=(new Date()).toString().replace(/GMT.*/,"");
		item.bill=thebill;
		// later: noncash -> nctype, ncval !!
		if((noncash!==undefined)&&(typeof noncash == 'number')) {
			item.noncash=1;
			item.ncval=noncash;
		}
		item.total=total;
		db.add_store_item('bills',item,function(event) {
			setTimeout(function() {
				payedbills.draw();
			},100);
			if(del) {
				bill.current={};
				bill.current_sum=0;
			}
			bill.draw();
			// open tray
			bill.open();
		});
	},
	info: function(event,bills) {
		var id=event.currentTarget.id;
		bill.old=bills[id].bill;
		bill.oldid=id;
		bill.olddate=bills[id].date;
		if(bills[id].noncash!==undefined) {
			bill.noncash=bills[id].noncash;
			bill.ncval=bills[id].ncval;
		}
		bill.draw('info');
	},
	reset: function(event) {
		// TODO set num to 50
		payedbills.draw();
	}
}

// categories

var categories = {
	selected: 0,
	init: function() {
		$("#categories_admin").css('display','none');
		$("#categories").css('display','block');
	},
	draw: function() {
		db.get_store_items('products',function(items) {
			var html="";
			for(var c in items) {
				var cat=items[c];
				html+="<div class=catbtndiv><button id=catbtn";
				html+=c+" value="+c+" class=catbtn>";
				html+=cat.category+"</button></div>";
			}
			$('#categories').html(html);
			categories.refresh();
			// admin mode
			if(tabnav.adminmode) {
				var html="<div class=catbtndiv>";
				html+="<button id=newcat class=catbtn "+
				      "value="+(parseInt(c)+1)+">";
				html+=NEW+"</button></div>"
				$('#categories').append(html);
			}
			// click event
			$('.catbtn').click(function(event) {
				categories.select(event.target);
			});
		});
	},
	refresh: function() {
		$('.catbtn').each(function() {
			$(this).css('background-color','');
		});
		$('#catbtn'+categories.selected).css(
			'background-color',DEFEMPHCOL
		);
	},
	select: function(trg) {
		var cid=parseInt(trg.value);
		if(tabnav.adminmode&&(categories.selected==cid)) {
			db.get_store_items('products',function(item) {
				categories.edit_dialog(item,cid);
			},cid,cid);
		}
		if(trg.id=="newcat") {
			var item={};
			item[cid]={
				category: NEW,
				items: []
			};
			categories.edit_dialog(item,cid,true);
		}
		categories.selected=cid;
		categories.refresh();
		products.draw_prods(cid);
	},
	edit_dialog: function(item,cid,isnew) {
			var html="<div class=edit_dialog_key>Name:</div>";
			html+="<div class=edit_dialog_val>";
			html+="<input type=text id=name>";
			html+="</input></div>";
			var width=0.4*$(window).width();
			var height=0.3*$(window).height();
			var buttons={};
			if(isnew===undefined) {
				buttons[EDEL]=function() {
					db.del_store_item("products",cid,
					                  function() {
						$('#dialog').dialog("close");
						setTimeout(function() {
							products.draw();
							categories.draw();
						},200);
					});
				};
			}
			buttons[ESAVE]=function() {
				var nitem={};
				nitem["category"]=ascii2html(
					$('#dialog>div>input#name').val()
				);
				nitem.items=item[cid].items;
				if(isnew===undefined) 
					db.update_store_item("products",cid,
					                     nitem,
					                     function() {
						$('#dialog').dialog("close");
						setTimeout(function() {
							categories.draw();
						},200);
					});
				else
					db.add_store_item("products",nitem,
					                  function() {
						$('#dialog').dialog("close");
						setTimeout(function() {
							categories.draw();
						},200);
				 	});
			};
			buttons[ECANCEL]=function() {
				$('#dialog').dialog("close");
			};
			$('#dialog').html(html);
			$('#dialog').dialog({
				modal: true,
				width: width,
				height: height,
				title: CEDIT,
				position: ['center',10],
				buttons: buttons
			});
			$('#dialog').dialog("open");
			$('.ui-dialog').css('background-color','white');
			$('.ui-dialog-titlebar-close').html('&#10007;');
			$('#dialog>div>input#name').val(
				html2ascii(item[cid].category)
			);
	}

}

// products

var products = {
	init: function() {
		$("#products_admin").css('display','none');
		$("#products").css('display','block');
		categories.refresh();
		$("#categories_admin").css('display','none');
		$("#categoies").css('display','block');
	},
	admin_init: function() {
		$("#products").css('display','none');
		$("#products_admin").css('display','block');
		$("#categoies").css('display','none');
		$("#categories_admin").css('display','block');
	},
	draw_prods: function(cid) {
		var c=parseInt(cid);
		db.get_item_by_key('products',c,function(cat) {
			var html=""
			for(var p in cat.items) {
				var prod=cat.items[p];
				html+="<div class=prodbtndiv>";
				html+="<button id=prodbtn"+p+" value="+p;
				html+=" class=prodbtn>";
				html+=prod.name+"</button></div>";
			}
			$('#products').html(html);
			for(var p in cat.items) {
				var element="#prodbtn"+p;
				var prod=cat.items[p];
				$(element).click(
					products.ret_select_prod_func(
						prod,p,c,false
					)
				);
			}
			// admin mode
			p=cat.items.length;
			if(tabnav.adminmode) {
				html="<div class=prodbtndiv>";
				html+="<button id=newprod class=prodbtn>";
				html+=NEW+"</button></div>";
				$('#products').append(html);
				$('#newprod').click(function() {
					var prod={
						name: NEW,
						brutto: 0,
						group: [],
						options: {}
					};
					products.select(prod,p,c,true);
				});
			}
		});
	},
	select_lock: 7,
	ret_select_prod_func: function(prod,pid,cid,isnew) {
		return function() {
			if(!tabnav.adminmode) {
				if(products.select_lock!=7) {
					var amsg="select lock 1 ("+
					         products.select_lock+"), "+
						 "tell your boss!";
					alert("amsg");
					return;
				}
				products.select_lock=0;
			}
			products.select(prod,pid,cid,isnew);
		};
	},
	select: function(prod,pid,cid,isnew) {
		if(tabnav.adminmode) {
			db.get_store_items('products',function(cat) {
				products.edit_dialog(cat,pid,cid,isnew);
			},cid,cid);
			return;
		}
		if(products.select_lock!=0) {
			var amsg="select lock 2 ("+products.select_lock+"), "+
				 "tell your boss!";
			alert(amsg);
			return;
		}
		products.select_lock+=1;
		if((prod.options!==undefined)&&(prod.options.length!=0)) {
			var btnset=[];
			for(var oid in prod.options) {
				var opt=prod.options[oid];
				var btntxt=opt.name+"\n";
				if(opt.add>0)
					btntxt+="+"+opt.add.toFixed(2)+" "+
					        CURRENCY;
				var btn={
					id: opt.name,
					value: opt.add,
					text: btntxt,
					click: products.cofunc(prod,pid,oid)
				};
				btnset.push(btn);
			}
			$('#products_options').dialog({
				modal: true,
				title: OPTIONSTITLE,
				position: ['center',10],
				buttons: btnset
			});
			$('#products_options').dialog("open");
			$('.ui-button').css('width','90%');
			$('.ui-button').css('height','70');
			$('.ui-button-text').css('text-align','left');
			$('.ui-dialog-titlebar-close').html('&#10007;');
		}
		else {
			products.select_final(prod,pid);
		}
	},
	cofunc: function(prod,pid,oid) {
		return function() {
			products.select_final(prod,pid,oid);
			$('#products_options').dialog("close");
		};
	},
	select_final: function(prod,pid,oid) {
		var nadd="";
		var badd=0;
		if(products.select_lock!=1) {
			var amsg="select lock 2 ("+products.select_lock+"), "+
				 "tell your boss!";
			alert(amsg);
			return;
		}
		products.select_lock+=2;
		if(oid!==undefined) {
			nadd=" "+prod.options[oid].name;
			badd=prod.options[oid].add;
		}
		for(var g in prod.group) {
			var gid=prod.group[g];
			db.get_item_by_key('groups',gid,function(grp) {
				var tax=grp.tax;
				var disc=grp.discount;
				var dround=grp.discround;
				orders.add_item(
					prod,
					gid,tax,disc,dround,
					//prod.brutto+badd,prod.name+nadd,pid,
					badd,nadd
				);
				// unlock select process
				products.select_lock+=4;
			});
			// default to first group
			break;
		}
	},
	edit_dialog: function(cat,pid,cid,isnew) {
		if(isnew) {
			var prod={};
			prod.name=NEW;
			prod.brutto="0";
			prod.group=[];
			prod.options=[];
			cat[cid].items.push(prod);
		} else {
			prod=cat[cid].items[pid];
		}
		var html="<div class=edit_dialog_key>Name:</div>";
		html+="<div class=edit_dialog_val>";
		html+="<input type=text id=name>";
		html+="</input></div>";
		html+="<div class=edit_dialog_key>Brutto:</div>";
		html+="<div class=edit_dialog_val>";
		html+="<input type=number id=brutto>";
		html+="</input></div>";
		html+="<div style=float:left;margin-right:5%;>Groups<br>";
		for(var gid in groups.items) {
			var val='value="'+gid+'"';
			var end="> ";
			if(contains(prod.group,parseInt(gid)))
				end=" checked> ";
			html+="<input type=checkbox class=edit_groups "+val+end;
			html+=groups.items[gid].name+"<br>";
		}
		html+="</div><div style=float:left;>Options<br>";
		for(var oid=0; oid<6; oid++) {
			var name="";
			var add=0;
			if((prod.options!==undefined)&&
			   (prod.options[oid]!==undefined)) {
				name=prod.options[oid].name;
				add=prod.options[oid].add;
			}
			html+="<div class=edit_options>";
			html+='<input type=text class=optname value="'+
			      name+'">';
			html+="</input>";
			html+="<input type=number class=optadd value="+add+">";
			html+="</input></div>";
		}
		var width=0.5*$(window).width();
		var height=0.6*$(window).height();
		var buttons={};
		if(!isnew) {
			buttons[EDEL]=products.dfunc(cat,cid,pid);
		}
		buttons[ESAVE]=products.sfunc(cat,cid,pid);

		buttons[ECANCEL]=function() {
			$('#dialog').dialog("close");
		};
		$('#dialog').html(html);
		$('#dialog').dialog({
			modal: true,
			width: width,
			height: height,
			title: PEDIT,
			position: ['center',10],
			buttons: buttons
		});
		$('#dialog').dialog("open");
		$('.ui-dialog').css('background-color','white');
		$('.ui-dialog-titlebar-close').html('&#10007;');
		$('#dialog>div>input#name').val(html2ascii(prod.name));
		$('#dialog>div>input#brutto').val(prod.brutto);
	},
	draw: function() {
		products.draw_prods(categories.selected);
		return;
	},
	dfunc: function(cat,cid,pid) {
		return function() {
			var c=cat[cid];
			var pn=c.items[pid].name;
			delete c.items[pid];
			db.update_store_item('products',cid,c,function() {
				log('product_delete',"deleted product "+pn,
				    function() {
					products.draw();
				});
			});
			$(this).dialog("close");
		}
	},
	sfunc: function(cat,cid,pid) {
		return function() {
			var c=cat[cid];
			var prod=c.items[pid];
			var oname=prod.name;
			prod.name=ascii2html(
				$('#dialog>div>input#name').val()
			);
			var obrutto=prod.brutto;
			prod.brutto=parseFloat(
				$('#dialog>div>input#brutto').val()
			);
			var ogrp=prod.group.join();
			var grp=[];
			$('#dialog>div>input.edit_groups:checked').each(
				function() {
					grp.push(parseInt($(this).val()));
				}
			);
			prod.group=grp;
			var oopt="";
			for(var oid in prod.options)
				oopt+=prod.options[oid].name+"("+
				      prod.options[oid].add+") ";
			var nopt="";
			var opt=[];
			$('#dialog>div>div.edit_options').each(function() {
				var on=$(this).find('.optname').val();
				var oa=parseFloat(
					$(this).find('.optadd').val()
				);
				on=on.replace(/^\s+|\s+$/g,'');
				if(on==="")
					return;
				opt.push({
					'name': on,
					'add': oa
				});
				nopt+=on+"("+oa+") ";
			});
			prod.options=opt;
			db.update_store_item('products',cid,c,function() {
				log('product_change',
				    "changed product "+oname+": "+
				    oname+" -> "+prod.name+", "+
				    obrutto+" -> "+prod.brutto+", "+
				    ogrp+" -> "+grp.join()+", "+
				    oopt+" -> "+nopt,
				    function() {
					products.draw();
				});
			});
			$(this).dialog("close");
		}
	}
}

// orders

var orders = {
	refresh: 0,
	showmode: "sel",
	select_mode: function(mode) {
		orders.showmode=mode;
	},
	showstate: "all",
	init: function() {
		$("#groupswin").css('display','none');
		$("#paywin>div#orderswin").css('display','block');
		orders.refresh=setInterval(orders.draw,33*1000);
		$("button#orders_ctrl_all").html(SHOWALL);
		$("button#orders_ctrl_sel").html(SHOWSEL);
		$("button#orders_ctrl_state").html(SHOWSTATEALL);
		$("button#orders_ctrl_movt").html(MOVETABLE);
		$("button#orders_ctrl_payt").html(PAYTABLE);
		$(".orders_ctrlbtn").click(function(event) {
			orders.ctrl(this);
		});
	},
	ctrl: function(btn) {
		switch(btn.id) {
			case 'orders_ctrl_payt':
				// only if table is selected
				if(orders.showmode!="sel") return;
				orders.pay_table();
				break;
			case 'orders_ctrl_movt':
				// only if table is selected
				if(orders.showmode!="sel") return;
				orders.mov_table();
				break;
			case 'orders_ctrl_state':
				switch(orders.showstate) {
					case 'all':
						orders.showstate='ip';
						$('button#orders_ctrl_state').html(
							SHOWSTATENO
						);
						break;
					case 'ip':
						orders.showstate='fin';
						$('button#orders_ctrl_state').html(
							SHOWSTATEYES
						);
						break;
					case 'fin':
						orders.showstate='all';
						$('button#orders_ctrl_state').html(
							SHOWSTATEALL
						);
						break;
				}
				cl("show: "+orders.showstate);
				break;
			default:
				orders.showmode=btn.id.replace("orders_ctrl_",
				                               "");
				break;
		}
		orders.draw();
	},
	add_item: function(prod,gid,tax,discount,discround,badd,nadd) {
		var nprod={};
		nprod.gid=gid;
		nprod.tax=tax;
		nprod.discount=discount;
		nprod.discround=discround;
		nprod.brutto=prod.brutto+badd;
		nprod.name=prod.name+nadd;
		nprod.odate=(new Date()).toString().replace(/GMT.*/,"");
		nprod.sdate="";
		nprod.table=map.selected_table;
		nprod.state="ip";
		nprod.group=prod.group;
		db.add_store_item('orders',nprod,function() {
			setTimeout(function() {
				orders.draw();
			},100);
		});
	},
	inject_item: function(prod) {
		var nprod={};
		nprod=clone(prod);
		db.add_store_item('orders',nprod,function() {
			setTimeout(function() {
				orders.draw();
			},100);
		});
	},
	del_item: function(inum) {
		db.del_store_item('orders',inum,function() {
			setTimeout(function() {
				orders.draw();
			},100);
		});
	},
	cancel: function(btn) {
		orders.del_item(parseInt(btn.value));
	},
	pay: function(btn) {
		var val=parseInt(btn.value);
		db.get_store_items('orders',function(item) {
			bill.add_item(item[val]);
			orders.del_item(val);
		},val,val);
	},
	draw: function() {
		db.get_store_items('orders',function(list) {

		var thtm="";
		var now=(new Date());

		for(var item in list) {
			if(list[item]==null) continue;
			if(orders.showmode=='sel') {
				if(list[item].table!=map.selected_table) {
					continue;
				}
			}
			if(orders.showstate=="ip"&&list[item].state!="ip")
				continue;
			if(orders.showstate=="fin"&&list[item].state!="fin")
				continue;
			var old=new Date(list[item].odate);
			var ref=now;
			if(list[item].state=='fin')
				ref=list[item].sdate;
			var diff=(ref-old)/(60*1000);
			var ts="";
			var mins=diff%60;
			var hours=(diff/60)%24;
			var html="<div class='orders_list_row'>";
			var btn="<button class='orders_list_cancelbtn' "+
				"value='"+item+"'>&#10007;</button>";
			html=html+"<div class='orders_list_cancel'>"+
				btn+"</div>";
			html=html+"<div class='orders_list_table'>"+
				  "<button class=orders_list_btn>"+
				list[item].table+"</button></div>";
			html=html+"<div class='orders_list_time'>"+
				  "<button class=orders_list_btn>"+
				  hours.toFixed(0)+"&deg;"+
				  ("0"+mins.toFixed(0)).slice(-2)+"&prime;"+
				  "</button></div>";
			var state=list[item].state=="ip"?STATEIP:STATEFIN;
			html=html+"<div class='orders_list_state'>"+
				  "<button class=orders_list_btn>"+
				  state+"</button></div>";
			html=html+"<div class='orders_list_name'>"+
				  "<button class=orders_list_btn>"+
			          list[item].name+" "+
			          list[item].brutto.toFixed(2)+" "+
			          CITEM+"</button></div>"
			html=html+"<div class='orders_list_gid'>"+
				  "<button class=orders_list_btn>"+
				  list[item].gid+"</button></div>"
			var btn="<button class='orders_list_paybtn' "+
				"value='"+item+"'>&#10143;</button>";
			html=html+"<div class='orders_list_pay'>"+
				btn+"</div>"
			html=html+"</div>";
			html=html+"<div class='orders_list_rspace'></div>";
			thtm=html+thtm;
		}
		$(".orders_list").each(function() {
			if($(this).parent().parent().attr('id')=="orderwin") {
				var lh=remove_sel_from_html_string(
					thtm,'.orders_list_pay'
				);
			}
			else {
				var lh=remove_sel_from_html_string(
					thtm,'.orders_list_cancel'
				);
			}
			$(this).html(lh);
		});
		$(".orders_list_cancelbtn").click(function(event) {
			orders.cancel(this);
		});
		$(".orders_list_paybtn").click(function(event) {
			orders.pay(this);
		});
		$("div.orders_list_row").each(function() {
			var tid=$(this).find("div.orders_list_table>button").html();
			var col="";
			//if(tid==map.selected_table)
				col=map.table_color[tid];
				//col=map.selected_table_col;
			$(this).css({"background-color":col});
			var odiv=this;
			var id=$(this).find(".orders_list_cancelbtn").val();
			if(id===undefined)
				// paywin, not orderwin
				id=$(this).find(".orders_list_paybtn").val();
			// state
			var sdiv=$(this).find("div.orders_list_state");
			var ndiv=$(this).find("div.orders_list_name");
			var tidiv=$(this).find("div.orders_list_time");
			$(sdiv).click(function() {
				orders.switch_state(odiv,sdiv,id);
			});
			$(ndiv).click(function() {
				orders.switch_state(odiv,sdiv,id);
			});
			$(tidiv).click(function() {
				orders.switch_state(odiv,sdiv,id);
			});
			// table
			var tadiv=$(this).find("div.orders_list_table");
			$(tadiv).click(function() {
				orders.switch_table(odiv,tadiv,id);
			});
			// group
			var gdiv=$(this).find("div.orders_list_gid");
			$(gdiv).click(function() {
				orders.switch_group(odiv,gdiv,id);
			});
		});
		if(orders.showmode=='all') {
			$('button#orders_ctrl_sel').css("background-color","");
			$('button#orders_ctrl_all').css(
				"background-color",DEFEMPHCOL
			);
			$('#orders_ctrl_payt').css("background-color","#555");
			$('#orders_ctrl_movt').css("background-color","#555");
		}
		else {
			$('button#orders_ctrl_all').css("background-color","");
			$('button#orders_ctrl_sel').css(
				"background-color",DEFEMPHCOL
			);
			$('#orders_ctrl_payt').css("background-color",DEFGOCOL);
			$('#orders_ctrl_movt').css("background-color",DEFGOCOL);
		}

		});
	},
	switch_state: function(odiv,sdiv,id) {
		var num=parseInt(id);
		db.get_store_items('orders',function(item){
			var order=item[num];
			if(order===undefined) {
				cl("switch state: unknown id!");
				return;
			}
			if(order.state=="ip") {
				order.state="fin";
				order.sdate=new Date();
				$(sdiv).html(STATEFIN);
			}
			else {
				order.state="ip";
				$(sdiv).html(STATEIP);
			}
			db.update_store_item('orders',num,order,function(){
				setTimeout(function() {
					orders.draw();
				},100);
			});
		},num,num);
	},
	mov_table: function() {
		var sel=map.selected_table;
		var width=0.95*$(window).width();
		var height=0.95*$(window).height();
		db.get_store_items('orders',function(item) {
			var mhtml=$('#map').html();
			var ghtml=$('.numpad_groups').html();

			// disable groups not selected in product definition
			// get possible groups
			var pgrps=[];
			var max=0;
			for(var g in groups.items) {
				pgrps.push(g);
				if(g>max)
					max=g;
			}
			for(var gval=1; gval<=max; gval++) {
				for(var o in item) {
					if(sel!=item[o].table)
						continue;
					if(!is_in_list(gval,item[o].group)) {
						var i=pgrps.indexOf(
							gval.toString()
						);
						pgrps.splice(i,1);
						break;
					}
				}
			}
			// disable in html
			for(var gval=1; gval<=max; gval++) {
				if(!is_in_list(gval,pgrps)) {
					ghtml=disable_sel_from_html_string(
						ghtml,'[value='+gval+']'
					);
				}
			}

			thtml=mhtml+"<br>"+ghtml;
			var html=remove_sel_from_html_string(
				thtml,['#numpad_plus_btn','#numpad_minus_btn']
			);
			$('#dialog').html(html);
			$('#dialog').dialog({
				modal: true,
				width: width,
				height: height,
				title: CTABLETITLE,
				position: ['center',10],
				buttons: []
			});
			$('#dialog').dialog("open");
			$('.ui-dialog').css('background-color','white');
			$('.ui-dialog-titlebar-close').html('&#10007;');
			var dc=map.selected_table_col;
			$('#dialog>div').each(function() {
				var th=$(this).css('height');
				nh=parseInt(th.replace(/px$/,'')*0.5);
				$(this).css('height',Math.round(nh)+'px');
			});
			$('#dialog>button').each(function() {
				var th=$(this).css('height');
				nh=parseInt(th.replace(/px$/,'')*0.5);
				$(this).css('height',Math.round(nh)+'px');
				var ng=$(this).html().split(":")[0];
				$(this).click(function() {
					for(var p in item) {
						var order=item[p];
						if(order.table==sel) {

						order.gid=parseInt(ng);
						// tax and discount
						var g=groups.items[ng];
						order.tax=g.tax;
						order.discount=g.discount;
						order.discround=g.discround;
						(orders.tcfunc(p,order))();

						}
					}
					$('#dialog').dialog("close");
				});
			});
			$('#dialog>div>button').each(function(){
				if(this.value==sel)
					$(this).css({"background-color":dc});
				else
					$(this).css({"background-color":""});
				$(this).click(function(event) {
					var nn=parseInt($(this).html());
					for(var p in item) {
						var order=item[p];
						if(order.table==sel) {
							order.table=nn;

						(orders.tcfunc(p,order))();

						}
					}
					$('#dialog').dialog("close");
				});
			});
		});


	},
	tcfunc: function(i,o) {
		return function() {
			db.update_store_item('orders',parseInt(i),o,function() {
				setTimeout(function() {
					map.selected_table=o.table;
					orders.draw();
					map.draw_upd();
				},100);
			});
		};
	},
	switch_table: function(odiv,tadiv,id) {
		var num=parseInt(id);
		var width=0.8*$(window).width();
		var height=0.8*$(window).height();
		db.get_store_items('orders',function(item){
			var order=item[num];
			var tn=order.table
			var html=$('#map').html();
			$('#dialog').html(html);
			$('#dialog').dialog({
				modal: true,
				width: width,
				height: height,
				title: CTABLETITLE,
				position: ['center',10],
				buttons: []
			});
			$('#dialog').dialog("open");
			$('.ui-dialog').css('background-color','white');
			$('.ui-dialog-titlebar-close').html('&#10007;');
			// mark active table (tn)
			var dc=map.selected_table_col;
			$('#dialog>div>button').each(function(){
				$(this).click(function(event) {
					var nn=$(this).html()
					order.table=nn;
					var col=map.table_color[nn];
				        $(odiv).css({"background-color":col});
				        $(tadiv).html(nn);
					db.update_store_item('orders',num,order,
					                     function(){
						setTimeout(function() {
							orders.draw();
						},100);
					});
					$('#dialog').dialog("close");
				});
				if(this.value==tn)
					$(this).css({"background-color":dc});
				else
					$(this).css({"background-color":""});
			});
		},num,num);
	},
	switch_group: function(odiv,gdiv,id) {
		var num=parseInt(id);
		var width=0.6*$(window).width();
		var height=0.6*$(window).height();
		db.get_store_items('orders',function(item) {
			var order=item[num];
			var og=order.gid;
			var ohtml=$('.numpad_groups').html();

			// remove +/- buttons
			var html=remove_sel_from_html_string(
				ohtml,['#numpad_plus_btn','#numpad_minus_btn']
			);

			// disable groups not selected in product definition
			// get possible groups
			var pgrps=[];
			var max=0;
			for(var g in groups.items) {
				pgrps.push(g);
				if(g>max)
					max=g;
			}
			for(var gval=1; gval<=max; gval++) {
				if(!is_in_list(gval,order.group)) {
					var i=pgrps.indexOf(
						gval.toString()
					);
					pgrps.splice(i,1);
				}
			}
			// disable in html
			for(var gval=1; gval<=max; gval++) {
				if(!is_in_list(gval,pgrps)) {
					html=disable_sel_from_html_string(
						html,'[value='+gval+']'
					);
				}
			}

			$('#dialog').html(html);
			$('#dialog').dialog({
				modal: true,
				width: width,
				height: height,
				title: CGROUPTITLE,
				position: ['center',10],
				buttons: []
			});
			$('#dialog').dialog("open");
			$('.ui-dialog').css('background-color','white');
			$('.ui-dialog-titlebar-close').html('&#10007;');
			$('#dialog>button').each(function(){
				var ng=$(this).html().split(":")[0];
				$(this).click(function(event) {
					order.gid=parseInt(ng);
					// adjust tax and discount
					var grp=groups.items[ng];
					order.tax=grp.tax;
					order.discount=grp.discount;
					order.discround=grp.discround;
					db.update_store_item('orders',num,order,
					                     function() {
						setTimeout(function() {
							orders.draw();
						},100);
					});
					$('#dialog').dialog("close");
				});
				var bg="blue";
				if(og==ng)
					$(this).css({"background-color":bg});
				else
					$(this).css({"background-color":""});
			});
		},num,num);
	},
	pay_table: function() {
		db.get_store_items('orders',function(list) {
			for(var item in list) {
				var p=list[item];
				if(p.table==map.selected_table) {
					bill.add_item(p);
					orders.del_item(parseInt(item));
				}
			}
			//orders.showmode="all";
			setTimeout(function() {
				orders.draw();
			},100);
		});
	}
}




// map

var map = {
	selected_table: 0,
	selected_table_col: "",
	tid_max: 0,
	table_color: [],
	table: [],
	fb: "",
	post_db_init: function() {
		// TODO only get last item
		db.get_store_items('map',function(maps) {
			last=objsize(maps);
			var lm=maps[last];
			map.selected_table=lm.default_table;
			map.selected_table_col=lm.selected_table_col;
			map.table_color=lm.table_color;
			map.table=lm.table;
			map.init();
		});
	},
	init: function() {
		$("#map_admin").css('display','none');
		$("#map").css('display','block');
		var table=map.table;
		for(var row in table) {
			for(var col in table[row]) {
				var tid=table[row][col];
				map.tid_max=map.tid_max>tid?map.tid_max:tid;
			}
		}
		map.draw_init();
		map.draw_upd();
	},
	admin_init: function() {
		$("#map").css('display','none');
		$("#map_admin").css('display','block');
	},
	draw_init: function() {
		var table=map.table;
		var numrow=table.length;
		if (numcol==0) return;
		var numcol=table[0].length;
		var stdw=100/numcol;
		var stdh=100/numrow;
		map.fb="";
		for(var row in table) {
			for(var col in table[row]) {
				map.draw_table(col,row);
			}
		}
		$('#map').html(map.fb);
		if(map.table_color.length!=map.tid_max+1)
			map.table_color=map.gencol(map.tid_max);
		$('.map_tablediv').each(function() {
			$(this).css({"height":stdh+"%"});
			$(this).css({"width":stdw+"%"});
			var tid=parseInt(this.id.replace("map_table_",""));
			if(tid==0) return;
			if(tid>0)
				$(this).css({
					"background-color": map.table_color[tid]
				});
			else
				if(tid==-1)
				$(this).css({
					"background-color": "#555"
				});
				if(tid==-2)
				$(this).css({
					"background-color": "#88a"
				});
		});
		$('.map_tablebtn').click(function(event) {
			map.table_select(this);
		});
		$('.map_tablebtn').each(function() {
			var dc=map.selected_table_col;
			if(this.value==map.selected_table)
				$(this).css({"background-color":dc});
			else
				$(this).css({"background-color":""});
		});
	},
	draw_upd: function() {
		$('.map_tablebtn').each(function() {
			var dc=map.selected_table_col;
			if(this.value==map.selected_table)
				$(this).css({"background-color":dc});
			else
				$(this).css({"background-color":""});
		});
	},
	draw_table: function(col,row) {
		var tid=map.table[row][col];
		if(tid>map.tid_max) tid_max=tid;
		map.fb=map.fb+"<div id='map_table_"+tid+"' "+
		              "class='map_tablediv'>";
		if(tid>0)
			map.fb=map.fb+"<button class='map_tablebtn' value='"+
				tid+"'>"+tid+"</button>";
		map.fb=map.fb+"</div>";
	},
	table_select: function(btn) {
		map.selected_table=parseInt(btn.value);
		map.draw_upd();
		orders.draw();
		orders.ctrl({'id':'orders_ctrl_sel'});
		tabnav.switch_tab();
	},
	gencol: function(max) {
		var cmap=[];
		delta=0;
		/*
		while(delta*delta*delta<map.tid_max)
		*/
		while(3*delta<map.tid_max)
			delta+=1;
		var inc=255/delta;
		var rv=0;
		var gv=0;
		var bv=0;
		var ptr;
		var cnt=0;
		while(cnt<=max) {
			//if(cnt%2==0)
				ptr=cnt;
			//else
			//	ptr=max%2!=0?max-cnt+1:max-cnt;
			cmap[ptr]="#"+("0"+(~~rv).toString(16)).slice(-2)+
			              ("0"+(~~gv).toString(16)).slice(-2)+
			              ("0"+(~~bv).toString(16)).slice(-2);
			switch(cnt%3) {
				case 0:	
					rv=(rv+inc)%255;
					break;
				case 1:
					gv=(gv+inc)%255;
					break;
				case 2:
					bv=(bv+inc)%255;
					break;
			}
			cnt+=1;
		}
		return cmap;
	}
}

// tabs

var tabnav = {
	init: function() {
		// display windows
		$('#tableswin').css('display','block');
		$('#orderwin').css('display','none');
		$('#paywin').css('display','none');
		// text
		tabnav.draw();
		// event handlers
		$('#tablesbtn').click(function(event) {
			tabnav.switch_tab('tables');
		});
		$('#ordersbtn').click(function(event) {
			tabnav.switch_tab('orders');
		});
		$('#paybtn').click(function(event) {
			tabnav.switch_tab('pay');
		});
		$('#adminbtn').click(function(event) {
			tabnav.toggle_adminmode();
		});
	},
	last: "orders",
	switch_tab: function(tab) {
		if(tab===undefined) {
			tabnav.switch_tab(tabnav.last);
			return;
		}
		switch(tab) {
			case 'tables':
				$('#tableswin').css('display','block');
				$('#orderwin').css('display','none');
				$('#paywin').css('display','none');
				break;
			case 'orders':
				$('#tableswin').css('display','none');
				$('#orderwin').css('display','block');
				$('#paywin').css('display','none');
				tabnav.last="orders";
				break;
			case 'pay':
				$('#tableswin').css('display','none');
				$('#orderwin').css('display','none');
				$('#paywin').css('display','block');
				tabnav.last="pay";
				// hack!
				var e=$('.bill_total_sum');
				e.css({
					'line-height': e.height()+"px",
					'font-size': e.height()*0.75+"px"
				});
				break;
			default:
				cl("unknown tab, not switching ...");

		}
	},
	adminmode: false,
	toggle_adminmode: function() {
		if(tabnav.adminmode) {
			tabnav.adminmode=false;
			tabnav.draw();
			clearInterval(tabnav.admin_blink_interval);
			$('#adminbtn').css('background-color','red');
			// windows
			numpad.init();
			$("#bonswin").css('display','none');
			$("#payedbillswin").css('display','block');
			$("#billwin").css('display','block');
			$("#configwin").css('display','none');
			$("#preconfigwin").css('display','none');
			$("#orderwin>div#orderswin").css('display','block');
			$("#paywin>div#orderswin").css('display','block');
			$("#empty").css('display','none');
			$("#groupswin").css('display','none');
			categories.draw();
			products.draw();
		}
		else {
			tabnav.adminmode=true;
			tabnav.draw();
			tabnav.admin_blink_interval=setInterval(function() {
				tabnav.admin_blink();
			},400);
			// windows
			numpad.admin_init();
			$("#bonswin").css('display','block');
			$("#payedbillswin").css('display','none');
			payedbills.draw_admin();
			$("#billwin").css('display','none');
			$("#preconfigwin").css('display','block');
			$("#preconfigwin").click(function() {
				$("#preconfigwin").css('display','none');
				$("#configwin").css('display','block');

			});
			$("#orderwin>div#orderswin").css('display','none');
			$("#paywin>div#orderswin").css('display','none');
			$("#empty").css('display','block');
			$("#groupswin").css('display','block');
			categories.draw();
			products.draw();
		}
	},
	admin_blink_interval: null,
	admin_blink: function() {
		if($('#adminbtn').css('background-color')!=="rgb(255, 0, 0)")
			$('#adminbtn').css('background-color',"red");
		else
			$('#adminbtn').css('background-color',"white");
	},
	draw: function() {
		if(tabnav.adminmode) {
			$('#tablesbtn').html(TABLES_ADMINMODE);
			$('#ordersbtn').html(ORDERS_ADMINMODE);
			$('#paybtn').html(PAY_ADMINMODE);
		}
		else {
			$('#tablesbtn').html(TABLES);
			$('#ordersbtn').html(ORDERS);
			$('#paybtn').html(PAY);
		}
	}
}

// epos

var epos_print = {
	dev: null,
	printer: null,
	print_addr: "",
	print_port: "8008",
	init: function() {
		cl("epos_print init! - "+epos_print_addr);
		var eDev = new epson.ePOSDevice();
		epos_print.dev=eDev;
		epos_print.print_addr=epos_print_addr;
		eDev.connect(epos_print.print_addr,
		             epos_print.print_port,function(data) {
			if(data=='OK'||data=='SSL_CONNECT_OK') {
				eDev.createDevice(
					'local_printer',
					eDev.DEVICE_TYPE_PRINTER,
				        {
						'crypto':false,
						'buffer':false
					},
					function(p,ret) {
						if(ret=='OK') {
							epos_print.printer=p;
							p.timeout=10000;
							cl("epos_print: "+
							   "printer device "+
							   "created!");
						}
						else {
							alert("epos_print: "+
							      "unable to "+
							      "create device");
						}
					});
			}
			else {
				alert("epos_print: unable to connect -"+data);
			}
		});
	},
	del: function() {
		epos_print.dev.deleteDevice(epos_print.printer,function(err) {
			epos_print.dev.disconnect();
		});
	},
	print: function(str) {
		epos_print.printer.addText(str);
		epos_print.printer.addCut(epos_print.printer.CUT_FEED);
		epos_print.printer.send();
	}
}

var rest = {
	port: 8080,
	init: function() {
		if(typeof webserver != "undefined") {
			cl("initialize rest interface");
			webserver.onRequest(function(req) {
				rest.respond(req);
			});
			cl("starting rest interface ...");
			webserver.start(rest.port);
			alert("cordova webserver listening on port "+rest.port);
		}
		else {
			alert("cordova webserver plugin not working!");
		}
	},
	respond: function(req) {
		cl("received rest request: "+JSON.stringify(req));
		rest.create_response_data(req);
	},
	send_response_data: function(req,data,type) {
		cl("sending rest response");
		webserver.sendResponse(req.requestId,{
			status: 200,
			body: JSON.stringify(data),
			headers: {
				'Content-Type': type,
				'Access-Control-Allow-Origin': '*'
			}

		});
	},
	create_response_data: function(req) {
		var type="application/json";
		var data={};
		data.date=(new Date()).toString();
		cl("rest call to "+req.path);
		var tmp=req.path.split("/");
		var path=tmp.splice(1,tmp.length);
		if(path.length==0)
			path=["unknown"];
		switch(path[0]) {
			case 'orders':
				if(req.method=='GET') {
					data.msg="serving "+req.path;
					db.get_store_items('orders',
					                   function(orders) {
						data.orders=orders;
						rest.send_response_data(
							req,data,type
						);
					});
				}
				if(req.method=='POST') {
					if(path.length==3) {
						var action=path[1];
						var id=path[2];
						data.msg=rest.modify_order(
							action,id
						);
					}
					else {
						data.msg="invalid request ("+
						         req.path+")";
					}
					rest.send_response_data(req,data,type);
				}
				break;
			case 'init':
				data=webservice_html_content;
				type="text/html";
				rest.send_response_data(req,data,type);
				break;
			default:
				data.msg="sorry, "+req.path+" not implemented";
				rest.send_response_data(req,data,type);
				break;
		}
	},
	modify_order: function(action,id) {
		// action = switch state (at the moment)
		var cdiv=$('button.orers_list_cancelbtn[value='+id+']');
		var odiv=cdiv.parent().parent();
		var sdiv=$(odiv).find('div.orders_list_state');
		orders.switch_state(odiv,sdiv,id);
	},
	exit: function() {
		webserver.stop();
	}
}

// main, i.e. cashreg

var cashreg = {
	init: function() {
		document.addEventListener('deviceready',this.startup,false);
	},
	startup: function() {
		// tab navigation init
		tabnav.init();

		// init database
		//db.del(); // delete (for testing)
		db.init("cashreg",function() {
			numpad.drawgroups();
			payedbills.draw();
			categories.draw();
			products.draw();
			map.post_db_init();
			orders.draw();
			bill.config_init();
			rest.init();
			//if(epos_print_addr!==undefined)
			//	epos_print.init();
			dbsync.startsync();
		},1,db_stores_and_content);

		// init numpad
		numpad.init();

		// init bill
		bill.init();

		// init categories
		categories.init();

		// init products
		products.init();

		// init orders
		orders.init();

		// payed bills init
		payedbills.init();

		// map init - now called by some onsuccess callback
		//map.init();
	},
	event_action: function(id) {
		return;
	}
}

$(document).ready(function() {
	//if(Modernizr.hasEvent('deviceready')) {
	if(window.cordova!==undefined) {
		cashreg.init();
	}
	else {
		cashreg.startup();
	}
});

