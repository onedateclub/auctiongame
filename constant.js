const STORAGE_KEY = "datingAuctionGame_pinkYellow_v1";

const TEAM_COUNT = 5;
const TEAM_NAMES = ["Team Red", "Team Yellow", "Team Blue", "Team Purple", "Team Black"];
const START_DIAMONDS = 100;
const ROUND_COUNT = 8;

// Distinct but on-theme team colors
const teamColors = ["#FF7DB0", "#FFD43B", "#1aabcf", "#8243ca", "#000000"];
  
// 8 Dating-event auction items (each with icon)  
const items = [
	{ id:1, icon:"👨‍👩‍👧‍👦", name:"家庭",  desc:"健康成長家庭中有愛錫自己的父母，家人關係和睦", mapUrl:"maps/family.jpg" },
	{ id:2, icon:"🩺",       name:"健康",  desc:"身體健康，沒有大病痛，不用手術，平安壽終正寢", mapUrl:"maps/health.jpg" },
	{ id:3, icon:"💄",       name:"外貌",  desc:"稱得上漂亮/英俊的身型及外表", mapUrl:"maps/beauty.jpg" },
	{ id:4, icon:"💼",       name:"事業",     desc:"能夠發揮自己專長又感興趣的工作，並有長遠的職涯發展", mapUrl:"maps/job.jpg" },
	{ id:5, icon:"🧑‍🤝‍🧑",  name:"友情", desc:"理解自己、無所不談又能夠陪伴一生的好友", mapUrl:"maps/friends.jpg" },
	{ id:6, icon:"💰",       name:"財富",   desc:"不是家財億萬，但終生不用為金錢擔憂。", mapUrl:"maps/money.jpg" },
	{ id:7, icon:"❤️",       name:"愛情",    desc:"一位神及眾人所祝福，彼此身心靈契合的伴侶", mapUrl:"maps/love.jpg" },
	{ id:8, icon:"⛪",       name:"信仰",  desc:"美好教會團契生活，有牧養，有清晰使命。在人生不確定中仍然堅定的信心，能夠終身回應上主的召命。", mapUrl:"maps/church.jpg" }
];