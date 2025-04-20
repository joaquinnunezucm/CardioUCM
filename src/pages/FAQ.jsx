import { faqs } from "../data/faqs";

const FAQ = () => {
  return (
    <div className="min-h-screen p-6 bg-green-50">
      <h1 className="text-2xl font-bold mb-4 text-green-800">Preguntas Frecuentes</h1>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold">{faq.pregunta}</h2>
            <p className="text-sm text-gray-700 mt-1">{faq.respuesta}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
