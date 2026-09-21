export default function ComandaFixa() {
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex h-20 items-center border-b p-4">
        <h2 className="text-lg font-bold text-gray-800">Comanda Atual</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <p className="text-center text-sm text-gray-400 mt-10">Nenhum item adicionado.</p>
      </div>
      <div className="border-t bg-gray-100 p-4">
        <div className="flex justify-between text-lg font-bold mb-4">
          <span>Total</span>
          <span>R$ 0,00</span>
        </div>
        <button className="w-full rounded bg-green-600 py-3 font-bold text-white hover:bg-green-700 transition">
          Finalizar Venda
        </button>
      </div>
    </div>
  );
}
