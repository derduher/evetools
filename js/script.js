/* Author:
Patrick Weygand
*/

(function (){
	var UserProps = Backbone.Model.extend({
		defaults: {
			brokersFee: 0.0097,
			salesTax: 0.01
		}
	});
	var Item = Backbone.Model.extend({
		defaults: {
			'itemQuantity': 0,
			'marketValue': 0
		}
	});
	var Minerals = Backbone.Model.extend({
		defaults: {
			'isogen': 0,
			'mexallon': 0,
			'nocxium': 0,
			'pyerite': 0,
			'tritanium': 0,
			'megacyte': 0,
			'morphite': 0,
			'zydrine': 0
		},
		calculate: function (mineralQuantity, mineralValue, brokersFee, tax) {
			var sub = mineralQuantity * mineralValue,
			brokersTotal = brokersFee * sub,
			totalTax = tax * sub;
			return {
				subTotal: sub,
				total: sub - brokersTotal - totalTax,
				brokersFee: brokersTotal,
				tax: totalTax
			};
		}
	});
	var MineralIndex = Backbone.Model.extend({
		defaults: {
			'tritanium': 4.5,
			'pyerite': 5,
			'mexallon': 30.38,
			'isogen': 59.96,
			'nocxium': 451.01,
			'zydrine': 775,
			'megacyte': 2720,
			'morphite': 3249.83
		}
	});
	var IskUnit = Backbone.Model.extend({
		defaults: {
			unit: 6
		}
	});
	var Calcs = Backbone.Model.extend({
		defaults: {
			mineralTotal: 0,
			marketTotal: 0
		},
		calculateMineral: function (mineralQuantity, mineralValue, brokersFee, tax) {
			var sub = mineralQuantity * mineralValue,
			brokersTotal = brokersFee * sub,
			totalTax = tax * sub;
			return {
				subTotal: sub,
				total: sub - brokersTotal - totalTax,
				brokersFee: brokersTotal,
				tax: totalTax
			};
		},
		calculateMineralTotal: function (mineralIndex, minerals, brokersFee, tax) {
			var total = 0;
			_(mineralIndex).each(function (value, key, list) {
				total += (this.calculateMineral(minerals[key], value, brokersFee, tax)).total;
			});
			return total;
		},
		inUnit: function (amount, unit) {
			return amount / Math.pow(10, unit);
		}
	});


	var CalcsView = Backbone.View.extend({
		tagName: 'p',
		id: 'finalTotals',
		className: 'entryForm',
		tmpl: '#CalcsView',
		initialize: function () {
			_(this).bindAll('render');
			this.options.item.on('change', this.render);
			this.options.index.on('change', this.render);
			this.options.minerals.on('change', this.render);
			this.options.user.on('change', this.render);
			this.options.iskUnit.on('change', this.render);
			this.index = this.options.index;
			this.unit = this.options.iskUnit;
			this.useTmpl = Mustache.compile($(this.tmpl).text());
			this.unitMap = {0:'', 3: 'K', 6: 'M', 9: 'B', 12: 'T'};
		},
		render: function () {
			var id,
			unitString,
			rawVal = 0,
			unit = this.unit.get('unit'),
			divisor = Math.pow(10, unit),
			brokersFee = this.options.user.get('brokersFee'),
			salesTax = this.options.user.get('salesTax'),
			marketVal = this.options.item.get('itemQuantity') * this.options.item.get('marketValue');
			marketVal = marketVal - marketVal * salesTax - marketVal * brokersFee;
			_(this.options.index.attributes).each(function (val, mineralName, list) {
				var amt = this.options.minerals.get(mineralName) * val;
				rawVal += amt - amt*brokersFee - amt*salesTax;
			}, this);

			marketVal = marketVal / divisor;
			rawVal = rawVal / divisor;
			unitString = this.unitMap[unit];

			this.$el.html(this.useTmpl({
				unit: unitString,
				marketVal: accounting.formatNumber(marketVal, 3),
				rawVal: accounting.formatNumber(rawVal, 3)
			}));
			if (marketVal > rawVal) {
				id = 'marketTotal';
			} else {
				id = 'rawTotal';
			}
			$('#' + id, this.el).addClass('higherVal');
			return this;
		}
	});

	var EntryFormView = Backbone.View.extend({
		tagName: 'ul',
		className: 'entryForm',
		update: function (e){
			var blah = {};
			blah[e.target.id] = e.target.value;
			this.model.set(blah);
		},
		tmpl: '#EntryFormView',
		initialize: function (attributes) {
			_.bindAll(this, 'render');
			this.renderTmpl = Mustache.compile($(this.tmpl).text());
		}
	});

	var MineralCalculation = Backbone.View.extend({
		tagName: 'span',
		className: 'mineralCalculation',
		initialize: function (attributes) {
			_.bindAll(this, 'render');
			//console.log(this.tmpl);
			this.renderTmpl = Mustache.compile($(this.tmpl).text());
			this.mineral = this.options.mineralName;
			this.model.on('change:' + this.mineral, this.render);
		},
		tmpl: '#MineralCalculation',
		render: function () {
			this.$el.html(this.renderTmpl({
				indexPrice: accounting.formatNumber(this.options.index.get(this.mineral), 2),
				calculated: accounting.formatNumber(this.options.index.get(this.mineral) * this.model.get(this.mineral), 2)
			}));
			return this;
		}
	});

	var MineralView = EntryFormView.extend({
		tagName: 'li',
		className: null,
		tmpl: '#MineralView',
		render: function () {
			var mineralName = this.options.mineralName;
			this.$el.html(this.renderTmpl({
				id: mineralName,
				val: this.model.get(mineralName),
				label: mineralName + ' Quantity'
			}));
			var mineralCalculation = new MineralCalculation({id: mineralName + "Calculation", model: this.model, mineralName: mineralName, index: this.options.index});
			this.$el.append(mineralCalculation.render().el);
			return this;
		}
	});

	var MineralsView = Backbone.View.extend({
		tagName: 'ul',
		events: {
			'change input.mineral': 'update'
		},
		update: function (e){
			var blah = {};
			blah[e.target.id] = e.target.value;
			this.model.set(blah);
		},
		render: function (){
			this.$el.empty();
			_.each(this.model.toJSON(), function (value, key, list) {
				mineralView = new MineralView({model: this.model, mineralName: key, index: this.options.index});
				this.$el.append(mineralView.render().el);
			}, this);
			return this;
		}
	});
	var ItemView = EntryFormView.extend({
		events: {
			'change input.item': 'update'
		}
	});
	var IskUnitView = Backbone.View.extend({
		tagName: 'select',
		id: 'unit',
		events: {
			'change': 'update'
		},
		names: [{val:0, label:''}, {val: 3, label: 'K'}, {val: 6, label: 'M'}, {val: 9, label: 'B'}, {val: 12, label: 'T'}],
		update: function (e){
			var blah = {};
			blah[e.target.id] = e.target.value;
			this.model.set(blah);
		},
		initialize: function () {
			_.bindAll(this, 'render');
			this.renderTmpl = Mustache.compile($(this.tmpl).text());
		},
		tmpl: '#IskUnitView',
		render: function (){
			this.$el.empty();
			var unit = this.model.get('unit');
			that = this;
			_(that.names).find(function (name) {
				name.selected = name.val == unit ? 'selected' : '';
				return name.val == unit;
			}, this);

			this.$el.append(this.renderTmpl(that));

			return this;
		}
	});
	var UserPropsView = Backbone.View.extend({
		tagName: 'ul',
		events: {
			'change input': 'update'
		},
		tmpl: '#UserPropsView',
		update: function (e){
			var blah = {};
			blah[e.target.id] = e.target.value;
			this.model.set(blah);
		},
		initialize: function () {
			_.bindAll(this, 'render');
			this.tmpl = Mustache.compile($(this.tmpl).text());
		},
		render: function (){
			this.$el.empty();
			this.$el.html(this.tmpl({
				id: 'brokersFee',
				val: this.model.get('brokersFee'),
				label: 'Brokers Fee'
			}) + this.tmpl({
				id: 'salesTax',
				val: this.model.get('salesTax'),
				label: 'sales tax'
			}));
			return this;
		}
	});

	var minerals = new Minerals(),
	item = new Item(),
	mineralIndex = new MineralIndex(),
	iskUnit = new IskUnit(),
	user = new UserProps(),
	itemView = new ItemView({el: $("#itemInput"), model: item}),
	mineralsView = new MineralsView({id: "mineralsInput", model: minerals, index: mineralIndex}),
	userPropsView = new UserPropsView({id: "userPropsInput", model: user}),
	iskUnitView = new IskUnitView({id: "unit", model: iskUnit}),
	calcsView = new CalcsView({
		minerals: minerals,
		item: item,
		index: mineralIndex,
		user: user,
		iskUnit: iskUnit
	});
	$('#itemInput').parent()
	.prepend(userPropsView.render().el)
	.append(mineralsView.render().el)
	.append(calcsView.render().el)
	.append(iskUnitView.render().el);
})();



