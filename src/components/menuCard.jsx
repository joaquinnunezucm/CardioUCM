import { Link } from "react-router-dom";

const MenuCard = ({ to, icon, label }) => (
  <Link
    to={to}
    className="bg-white border shadow rounded-xl p-6 flex flex-col items-center justify-center hover:bg-gray-50 transition"
  >
    <span className="text-3xl mb-2">{icon}</span>
    <span className="text-lg font-semibold">{label}</span>
  </Link>
);

export default MenuCard;
