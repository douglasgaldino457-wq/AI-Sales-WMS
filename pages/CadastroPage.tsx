
import React from 'react';
import { FilePlus } from 'lucide-react';

const CadastroPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-brand-gray-400 animate-fade-in">
        <div className="bg-white p-8 md:p-12 rounded-3xl text-center max-w-lg shadow-xl border border-brand-gray-100 relative overflow-hidden mx-4">
            {/* Decorative top bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-gray-200 via-brand-primary to-brand-gray-200"></div>
            
            {/* Icon */}
            <div className="w-24 h-24 bg-brand-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FilePlus className="text-brand-primary animate-pulse" size={48} />
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold mb-3 text-brand-gray-900">Módulo de Cadastro</h2>
            
            {/* Badge */}
            <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-6 border border-yellow-200">
                Em Construção
            </span>
            
            {/* Description */}
            <p className="text-brand-gray-600 mb-6 leading-relaxed text-sm md:text-base">
                Estamos reformulando o fluxo de cadastro manual para incluir validação automática de CNPJ e enriquecimento de dados via IA.
            </p>
        </div>
    </div>
  );
};

export default CadastroPage;
