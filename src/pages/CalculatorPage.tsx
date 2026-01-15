import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Delete } from 'lucide-react';

export default function CalculatorPage() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('');
  
  const handleClick = (val: string) => {
    setDisplay(prev => prev + val);
  };

  const calculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(display); 
      setDisplay(String(result));
    } catch {
      setDisplay('Error');
    }
  };

  const clear = () => setDisplay('');
  const backspace = () => setDisplay(prev => prev.slice(0, -1));

  const Btn = ({ v, onClick, className }: any) => (
    <button 
        onClick={onClick ? onClick : () => handleClick(v)}
        className={`h-16 rounded-2xl font-bold text-xl shadow-3d hover:shadow-3d-hover active:shadow-3d-active transition-all ${className || 'bg-[#eef2f6] text-gray-700'}`}
    >
        {v}
    </button>
  );

  return (
    <div className="max-w-md mx-auto pb-20">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#eef2f6] shadow-3d hover:shadow-3d-hover active:shadow-3d-active text-gray-600">
          <ArrowRight className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-black text-gray-800">الآلة الحاسبة</h1>
      </header>

      <div className="bg-[#eef2f6] p-6 rounded-3xl shadow-3d border border-white/50">
        <div className="bg-[#eef2f6] h-24 mb-6 rounded-xl shadow-3d-inset flex items-end justify-end p-4">
            <span className="text-3xl font-mono font-bold text-gray-800 tracking-widest">{display || '0'}</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
            <Btn v="C" onClick={clear} className="text-red-500" />
            <Btn v="/" className="text-blue-600" />
            <Btn v="*" className="text-blue-600" />
            <button onClick={backspace} className="h-16 rounded-2xl font-bold text-xl shadow-3d bg-[#eef2f6] text-orange-500 flex items-center justify-center"><Delete className="w-6 h-6" /></button>

            <Btn v="7" /> <Btn v="8" /> <Btn v="9" /> <Btn v="-" className="text-blue-600" />
            <Btn v="4" /> <Btn v="5" /> <Btn v="6" /> <Btn v="+" className="text-blue-600" />
            <Btn v="1" /> <Btn v="2" /> <Btn v="3" /> <Btn v="=" onClick={calculate} className="row-span-2 bg-blue-600 text-white" />
            <Btn v="0" className="col-span-2" /> <Btn v="." />
        </div>
      </div>
    </div>
  );
}
