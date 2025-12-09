import React from 'react';
import { FilePlus, HardHat } from 'lucide-react';

const CadastroPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-brand-gray-400 animate-fade-in">
      <div className="bg-white p-12 rounded-3xl text-center max-w-lg shadow-xl border border-brand-gray-100 relative overflow-hidden mx-4">
        {/* Decorative top bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-gray-200 via-brand-primary to-brand-gray-200"></div>

        <div className="w-24 h-24 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FilePlus className="text-brand-gray-300" size={48} />
        </div>

        <h2 className="text-2xl font-bold mb-3 text-brand-gray-900">Módulo de Cadastro</h2>

        <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide border border-yellow-200">
                <HardHat size={14} />
                Em Construção
            </span>
        </div>

        <p className="text-brand-gray-600 mb-2 leading-relaxed text-sm md:text-base">
          Estamos reformulando o processo de cadastro para integrá-lo diretamente à inteligência de dados.
        </p>
        <p className="text-brand-gray-400 text-xs">
            Em breve disponível para Inside e Field Sales.
        </p>
      </div>
    </div>
  );
};

export default CadastroPage;
