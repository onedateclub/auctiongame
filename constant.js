const STORAGE_KEY = "datingAuctionGame_pinkYellow_v1";

const TEAM_COUNT = 5;
const TEAM_NAMES = ["Team Red", "Team Yellow", "Team Blue", "Team Purple", "Team Black"];
const START_DIAMONDS = 100;
const ROUND_COUNT = 6;

// Distinct but on-theme team colors
const teamColors = ["#FF7DB0", "#FFD43B", "#1aabcf", "#8243ca", "#000000"];
  
// 6 Dating-event auction items (each with icon)  
const items = [
	{ id:1, icon:"🏋️",  name:"健康",  desc:"一個健康的身體，及讓自己感到自信、自在的外貌與體態", mapUrl:"maps/beauty_new.jpg" },
	{ id:2, icon:"💼",  name:"事業", desc:"能夠發揮自己才能又感興趣的工作，並有長遠的職涯發展", mapUrl:"maps/job.jpg" },
	{ id:3, icon:"🧑‍🤝‍🧑",  name:"友情", desc:"一位理解自己、真心待你、無所不談又能夠陪伴一生的好友", mapUrl:"maps/friends.jpg" },
	{ id:4, icon:"💰",  name:"財富", desc:"穩定充裕的財務狀況，不用擔心生活開支", mapUrl:"maps/money.jpg" },
	{ id:5, icon:"❤️",  name:"愛情", desc:"一位神及眾人所祝福，彼此身心靈契合的伴侶，能與跟你組織理想家庭", mapUrl:"maps/love.jpg" },
	{ id:6, icon:"⛪",  name:"信仰", desc:"能被牧養、能與群體同行、能在不確定中仍然堅定信靠上主的屬靈生命，並能一生回應主召命", mapUrl:"maps/church.jpg" }
];