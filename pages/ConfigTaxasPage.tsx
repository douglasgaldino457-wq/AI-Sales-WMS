
import React from 'react';
import { Settings, Save } from 'lucide-react';

const ConfigTaxasPage: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-brand-gray-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-brand-primary" />
                    Configuração de Taxas Base
                </h1>
                <p className="text-brand-gray-600 mt-1">Definição de Spreads e Custos Operacionais.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-100 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-bold text-brand-gray-900 mb-4 border-b pb-2">Parâmetros Gerais</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Spread Padrão (%)</label>
                                <input type="number" defaultValue={0.65} className="w-full border border-brand-gray-300 rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Custo MD (Débito)</label>
                                <input type="number" defaultValue={0.40} className="w-full border border-brand-gray-300 rounded-lg p-2" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-gray-900 mb-4 border-b pb-2">Limites de Aprovação Automática</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Piso Débito (%)</label>
                                <input type="number" defaultValue={0.80} className="w-full border border-brand-gray-300 rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-gray-700 mb-1">Piso Crédito 12x (%)</label>
                                <input type="number" defaultValue={9.50} className="w-full border border-brand-gray-300 rounded-lg p-2" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                    <button className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-dark transition-colors">
                        <Save className="w-4 h-4" />
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigTaxasPage;
