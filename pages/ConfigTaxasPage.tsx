
import React, { useState, useRef } from 'react';
import { 
  Settings, Edit3, Save, RefreshCw, Upload, Sparkles, Bot, 
  Plus, Trash2, MoreHorizontal, AlertCircle, X
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface RangeTableData {
    headers: string[]; // e.g. ['Parcelas', '0-10k', '10k+']
    ranges: { min: number, max: number, label: string }[]; // Metadata for logic
    rows: { label: string, values: number[] }[]; // The matrix
}

// Data from the uploaded image (Initial State for Full)
const INITIAL_RANGE_TABLE_FULL: RangeTableData = {
    headers: ['Parcelas', '5-10 k', '10-20 k', '20-50 k', '50-100 k', '100-150 k', '>150k'],
    ranges: [
        { min: 5000, max: 10000, label: '5-10k' },
        { min: 10001, max: 20000, label: '10-20k' },
        { min: 20001, max: 50000, label: '20-50k' },
        { min: 50001, max: 100000, label: '50-100k' },
        { min: 100001, max: 150000, label: '100-150k' },
        { min: 150001, max: 999999999, label: '>150k' },
    ],
    rows: [
        { label: 'Débito', values: [2.01, 1.95, 1.81, 1.26, 1.16, 1.06] },
        { label: '1x', values: [5.08, 4.38, 3.73, 3.17, 3.09, 3.01] },
        { label: '2x', values: [6.39, 5.42, 4.78, 4.62, 4.53, 4.45] },
        { label: '3x', values: [8.52, 7.37, 6.07, 5.83, 5.75, 5.67] },
        { label: '4x', values: [9.80, 8.83, 7.29, 7.05, 6.97, 6.89] },
        { label: '5x', values: [11.07, 10.10, 8.75, 8.26, 8.18, 8.10] },
        { label: '6x', values: [11.72, 10.75, 9.80, 9.39, 9.31, 9.23] },
        { label: '7x', values: [12.22, 11.25, 10.85, 10.85, 10.77, 10.69] },
        { label: '8x', values: [13.39, 13.12, 12.72, 12.31, 12.23, 12.15] },
        { label: '9x', values: [14.58, 14.57, 13.77, 13.36, 13.28, 13.20] },
        { label: '10x', values: [15.77, 15.63, 14.83, 14.83, 14.75, 14.67] },
        { label: '11x', values: [16.96, 16.69, 16.69, 15.88, 15.80, 15.72] },
        { label: '12x', values: [18.14, 17.74, 17.74, 16.93, 16.85, 16.77] },
    ]
};

// Initial State for Simple
const INITIAL_RANGE_TABLE_SIMPLE: RangeTableData = {
    headers: ['Parcelas', 'Até 10k', '10-30k', '>30k'],
    ranges: [
        { min: 0, max: 10000, label: 'Até 10k' },
        { min: 10001, max: 30000, label: '10-30k' },
        { min: 30001, max: 999999999, label: '>30k' },
    ],
    rows: [
        { label: 'Débito', values: [2.39, 2.19, 1.99] },
        { label: 'Cred. A vista ou 1x', values: [5.59, 5.29, 4.99] },
        { label: '2x a 6x', values: [14.90, 14.50, 13.90] },
        { label: '7x a 12x', values: [21.90, 21.50, 20.90] },
        { label: '13x a 18x', values: [28.90, 28.50, 27.90] },
        { label: 'Antecipação - % a.m', values: [4.99, 4.59, 3.99] },
    ]
};

const ConfigTaxasPage: React.FC = () => {
  // Data State
  const [rangeTableFull, setRangeTableFull] = useState<RangeTableData>(INITIAL_RANGE_TABLE_FULL);
  const [rangeTableSimple, setRangeTableSimple] = useState<RangeTableData>(INITIAL_RANGE_TABLE_SIMPLE);
  
  // Config Tab State
  const [configProduct, setConfigProduct] = useState<'FULL' | 'SIMPLE'>('FULL');
  const [isProcessingTable, setIsProcessingTable] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const tableUploadRef = useRef<HTMLInputElement>(null);

  const activeTable = configProduct === 'FULL' ? rangeTableFull : rangeTableSimple;
  const setTable = configProduct === 'FULL' ? setRangeTableFull : setRangeTableSimple;

  // --- CELL EDITING ---
  const handleTableValueChange = (rowIdx: number, colIdx: number, val: string) => {
      const numVal = parseFloat(val) || 0;
      setTable(prev => {
          const newRows = [...prev.rows];
          const newValues = [...newRows[rowIdx].values];
          newValues[colIdx] = numVal;
          newRows[rowIdx] = { ...newRows[rowIdx], values: newValues };
          return { ...prev, rows: newRows };
      });
  };

  // --- HEADER EDITING (COLUMNS) ---
  const handleHeaderChange = (colIdx: number, newVal: string) => {
      setTable(prev => {
          const newHeaders = [...prev.headers];
          newHeaders[colIdx] = newVal;
          
          // Also sync with ranges if it's a range column (index > 0)
          const rangeIdx = colIdx - 1;
          const newRanges = [...prev.ranges];
          if (newRanges[rangeIdx]) {
              newRanges[rangeIdx] = { ...newRanges[rangeIdx], label: newVal };
          }

          return { ...prev, headers: newHeaders, ranges: newRanges };
      });
  };

  const handleAddColumn = () => {
      setTable(prev => {
          const newLabel = `Nova Faixa ${prev.ranges.length + 1}`;
          // 1. Add Header
          const newHeaders = [...prev.headers, newLabel];
          // 2. Add Range Metadata
          const newRanges = [...prev.ranges, { min: 0, max: 0, label: newLabel }];
          // 3. Add 0 value to every row
          const newRows = prev.rows.map(row => ({
              ...row,
              values: [...row.values, 0]
          }));

          return { headers: newHeaders, ranges: newRanges, rows: newRows };
      });
  };

  const handleRemoveColumn = (colIdx: number) => {
      if (activeTable.headers.length <= 2) {
          alert("A tabela deve ter pelo menos uma faixa.");
          return;
      }
      setTable(prev => {
          const newHeaders = prev.headers.filter((_, i) => i !== colIdx);
          // Adjust index for ranges (header 0 is 'Parcelas')
          const rangeIdxToRemove = colIdx - 1;
          const newRanges = prev.ranges.filter((_, i) => i !== rangeIdxToRemove);
          
          // Remove value at specific index from all rows
          const newRows = prev.rows.map(row => ({
              ...row,
              values: row.values.filter((_, i) => i !== rangeIdxToRemove)
          }));

          return { headers: newHeaders, ranges: newRanges, rows: newRows };
      });
  };

  // --- ROW LABEL EDITING ---
  const handleRowLabelChange = (rowIdx: number, newVal: string) => {
      setTable(prev => {
          const newRows = [...prev.rows];
          newRows[rowIdx] = { ...newRows[rowIdx], label: newVal };
          return { ...prev, rows: newRows };
      });
  };

  const handleAddRow = () => {
      setTable(prev => {
          const emptyValues = new Array(prev.ranges.length).fill(0);
          const newRow = { label: 'Nova Parcela', values: emptyValues };
          return { ...prev, rows: [...prev.rows, newRow] };
      });
  };

  const handleRemoveRow = (rowIdx: number) => {
      setTable(prev => {
          return { ...prev, rows: prev.rows.filter((_, i) => i !== rowIdx) };
      });
  };

  // --- AI IMPORT ---
  const handleTableImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      setIsProcessingTable(true);

      try {
          const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
          });
          const base64Data = base64.split(',')[1];

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const rowsLabels = activeTable.rows.map(r => r.label).join(', ');
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                  parts: [
                      { inlineData: { mimeType: file.type, data: base64Data } },
                      { 
                        text: `
                          Você é um assistente de entrada de dados. Analise a imagem desta tabela de taxas.
                          
                          Estrutura Alvo:
                          Linhas esperadas: ${rowsLabels}
                          Colunas (Ranges): ${activeTable.ranges.length} colunas.

                          Tarefa:
                          Extraia SOMENTE os valores numéricos (taxas %) para preencher a matriz existente.
                          
                          Retorne APENAS um JSON:
                          {
                            "rows": [
                                { "label": "Débito", "values": [1.99, 1.89, ...] },
                                { "label": "1x", "values": [...] }
                            ]
                          }
                        `
                      }
                  ]
              }
          });

          const text = response.text || "";
          const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const json = JSON.parse(cleanText);

          if (json && json.rows && Array.isArray(json.rows)) {
              setTable(prev => {
                  const updatedRows = prev.rows.map(existingRow => {
                      const found = json.rows.find((r: any) => 
                          r.label.toLowerCase().includes(existingRow.label.toLowerCase().replace('x','')) || 
                          r.label.toLowerCase() === existingRow.label.toLowerCase()
                      );
                      
                      if (found && Array.isArray(found.values)) {
                          const newValues = existingRow.values.map((v, i) => found.values[i] !== undefined ? Number(found.values[i]) : v);
                          return { ...existingRow, values: newValues };
                      }
                      return existingRow;
                  });
                  return { ...prev, rows: updatedRows };
              });
              setAiFeedback("Tabela atualizada com sucesso via IA!");
          } else {
              setAiFeedback("Não foi possível extrair dados estruturados.");
          }

      } catch (err) {
          console.error("AI Table Error", err);
          setAiFeedback("Erro ao processar imagem.");
      } finally {
          setIsProcessingTable(false);
          if (tableUploadRef.current) tableUploadRef.current.value = '';
          setTimeout(() => setAiFeedback(null), 4000);
      }
  };

  return (
      <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-20">
          <div className="flex justify-between items-start">
              <div>
                  <h2 className="text-xl font-bold text-brand-gray-900 flex items-center gap-2">
                      <Settings className="w-6 h-6 text-brand-primary" />
                      Configuração de Tabelas
                  </h2>
                  <p className="text-sm text-brand-gray-500">
                      Edite colunas (ranges), linhas (parcelas) e valores manualmente ou via IA.
                  </p>
              </div>
              <div className="flex bg-brand-gray-100 p-1 rounded-lg">
                  <button 
                      onClick={() => setConfigProduct('FULL')} 
                      className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${configProduct === 'FULL' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500 hover:text-brand-gray-800'}`}
                  >
                      Tabela Full
                  </button>
                  <button 
                      onClick={() => setConfigProduct('SIMPLE')} 
                      className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${configProduct === 'SIMPLE' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-gray-500 hover:text-brand-gray-800'}`}
                  >
                      Tabela Simples
                  </button>
              </div>
          </div>

          {/* AI Import Section */}
          <div className="bg-brand-gray-900 rounded-xl p-6 text-white flex flex-col md:flex-row items-center gap-6 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                  <Bot size={200} />
              </div>
              <div className="flex-1 relative z-10">
                  <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brand-light" />
                      Importação Inteligente
                  </h3>
                  <p className="text-sm text-brand-gray-300 mb-4">
                      Carregue um print da tabela atual e a IA preencherá os valores nas células correspondentes.
                  </p>
                  
                  <div className="flex items-center gap-3">
                      <button 
                          onClick={() => tableUploadRef.current?.click()}
                          disabled={isProcessingTable}
                          className="bg-brand-primary hover:bg-brand-dark text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                          {isProcessingTable ? <RefreshCw className="animate-spin w-4 h-4"/> : <Upload className="w-4 h-4" />}
                          {isProcessingTable ? 'Processando...' : 'Carregar Imagem da Tabela'}
                      </button>
                      <input type="file" ref={tableUploadRef} onChange={handleTableImageUpload} className="hidden" accept="image/*" />
                      {aiFeedback && <span className="text-xs text-green-400 font-medium animate-fade-in">{aiFeedback}</span>}
                  </div>
              </div>
          </div>

          {/* Dynamic Table Editor */}
          <div className="bg-white rounded-xl shadow-sm border border-brand-gray-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-brand-gray-100 bg-brand-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-brand-gray-800 text-sm flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-brand-primary" />
                      Editor Dinâmico ({configProduct === 'FULL' ? 'Full' : 'Simples'})
                  </h3>
                  <button className="text-xs bg-brand-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2">
                      <Save className="w-3 h-3" /> Salvar Alterações
                  </button>
              </div>
              
              <div className="overflow-x-auto p-4">
                  <div className="inline-block min-w-full">
                      <table className="w-full text-center text-sm border-collapse">
                          <thead>
                              <tr className="bg-white border-b-2 border-brand-gray-100 text-brand-gray-500 font-bold uppercase text-xs">
                                  {/* Row Label Header (Parcelas) */}
                                  <th className="px-4 py-3 text-left w-48 bg-brand-gray-50 border-r border-brand-gray-200">
                                      {activeTable.headers[0]}
                                  </th>
                                  
                                  {/* Range Headers (Editable) */}
                                  {activeTable.headers.slice(1).map((h, i) => (
                                      <th key={i} className="px-2 py-3 min-w-[100px] border-r border-brand-gray-100 group relative">
                                          <input 
                                              value={h}
                                              onChange={(e) => handleHeaderChange(i + 1, e.target.value)}
                                              className="w-full text-center bg-transparent focus:bg-brand-gray-50 outline-none rounded py-1 px-2 font-bold text-brand-primary placeholder-brand-gray-300 transition-colors"
                                              placeholder="Nome da Faixa"
                                          />
                                          {/* Delete Column Button */}
                                          <button 
                                              onClick={() => handleRemoveColumn(i + 1)}
                                              className="absolute -top-1 -right-1 bg-white text-red-400 hover:text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-brand-gray-100"
                                              title="Remover Coluna"
                                          >
                                              <X size={12} strokeWidth={3} />
                                          </button>
                                      </th>
                                  ))}
                                  
                                  {/* Add Column Button */}
                                  <th className="px-2 py-3 w-12 bg-brand-gray-50 border-l border-brand-gray-100">
                                      <button 
                                          onClick={handleAddColumn}
                                          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-brand-gray-200 text-brand-gray-400 hover:text-brand-primary hover:border-brand-primary transition-all mx-auto"
                                          title="Adicionar Faixa"
                                      >
                                          <Plus size={16} />
                                      </button>
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-gray-50">
                              {activeTable.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-brand-gray-50 transition-colors group">
                                      {/* Row Label (Editable) */}
                                      <td className="px-4 py-2 font-bold text-brand-gray-900 text-left bg-brand-gray-50/50 border-r border-brand-gray-100 relative">
                                          <div className="flex items-center">
                                              <input 
                                                  value={row.label}
                                                  onChange={(e) => handleRowLabelChange(rIdx, e.target.value)}
                                                  className="w-full bg-transparent focus:bg-white outline-none rounded px-2 py-1 transition-colors"
                                              />
                                              {/* Delete Row Button */}
                                              <button 
                                                  onClick={() => handleRemoveRow(rIdx)}
                                                  className="ml-2 text-brand-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="Remover Linha"
                                              >
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                      </td>
                                      
                                      {/* Values */}
                                      {row.values.map((val, vIdx) => (
                                          <td key={vIdx} className="p-1 border-r border-brand-gray-100">
                                              <input 
                                                  type="number" 
                                                  step="0.01"
                                                  className="w-full text-center bg-transparent focus:bg-white border border-transparent focus:border-brand-primary rounded px-1 py-1.5 outline-none font-medium text-brand-gray-700 transition-all hover:bg-brand-gray-100 focus:ring-2 focus:ring-brand-primary/10"
                                                  value={val}
                                                  onChange={(e) => handleTableValueChange(rIdx, vIdx, e.target.value)}
                                              />
                                          </td>
                                      ))}
                                      
                                      {/* Empty cell for "Add Column" alignment */}
                                      <td className="bg-brand-gray-50/30"></td>
                                  </tr>
                              ))}
                              
                              {/* Add Row Button */}
                              <tr>
                                  <td colSpan={activeTable.headers.length + 1} className="p-2">
                                      <button 
                                          onClick={handleAddRow}
                                          className="w-full py-2 border-2 border-dashed border-brand-gray-200 rounded-lg text-brand-gray-400 hover:text-brand-primary hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                                      >
                                          <Plus size={14} /> Adicionar Linha
                                      </button>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
              
              <div className="bg-blue-50 p-4 border-t border-blue-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                      <p className="font-bold mb-1">Dica de Configuração:</p>
                      <p>Use os cabeçalhos das colunas para definir os ranges de faturamento (ex: "50-100k"). As alterações aqui impactam diretamente o simulador e a geração de propostas em PDF.</p>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default ConfigTaxasPage;
