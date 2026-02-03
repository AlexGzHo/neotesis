import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export const SampleCalculator = () => {
    const [params, setParams] = useState({
        N: '', // Population
        Z: '1.96', // Confidence
        e: '5', // Error %
        p: '50' // Probability
    });
    const [result, setResult] = useState(0);

    const handleChange = (e) => {
        setParams({ ...params, [e.target.id]: e.target.value });
    };

    const calculate = () => {
        const N = params.N ? parseFloat(params.N) : Infinity;
        const Z = parseFloat(params.Z);
        const e = parseFloat(params.e) / 100;
        const p = parseFloat(params.p) / 100;
        const q = 1 - p;

        let n;
        const num = (Z ** 2) * p * q;
        const den = (e ** 2);

        if (N === Infinity) {
            n = num / den;
        } else {
            // Finite population formula
            // n = (N * Z^2 * p * q) / ((N-1)*e^2 + Z^2*p*q)
            const numFinite = N * (Z ** 2) * p * q;
            const denFinite = (N - 1) * (e ** 2) + (Z ** 2) * p * q;
            n = numFinite / denFinite;
        }

        setResult(Math.ceil(n));
    };

    return (
        <div className="animate-fadeIn py-12 px-8 max-w-7xl mx-auto">
            <div className="section-header text-center mb-10">
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">Estadística Inferencial</span>
                <h2 className="text-4xl text-primary mb-4 font-bold">Calculadora de Muestra</h2>
                <p className="text-gray text-lg max-w-2xl mx-auto">Calcula con precisión el tamaño de tu muestra para investigaciones con poblaciones finitas e infinitas.</p>
            </div>

            <div className="bg-white p-10 rounded-3xl shadow-modal border border-border flex flex-col gap-6 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
                <div className="flex flex-col gap-4">
                    <Input
                        id="N"
                        label="Población (Universo)"
                        type="number"
                        placeholder="Ej: 5000 (O vacío si es infinita)"
                        icon="fas fa-users"
                        value={params.N}
                        onChange={handleChange}
                    />

                    <div className="grid grid-cols-2 gap-6">
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-bold text-primary">Confianza</label>
                            <div className="relative flex items-center">
                                <i className="fas fa-shield-alt absolute left-4 text-gray text-lg"></i>
                                <select
                                    id="Z"
                                    className="w-full p-4 pl-12 border-2 border-border rounded-xl text-base transition-colors focus:outline-none focus:border-accent bg-white"
                                    value={params.Z}
                                    onChange={handleChange}
                                >
                                    <option value="1.645">90%</option>
                                    <option value="1.96">95%</option>
                                    <option value="2.576">99%</option>
                                </select>
                            </div>
                        </div>
                        <Input
                            id="e"
                            label="Error (%)"
                            type="number"
                            step="0.1"
                            icon="fas fa-bullseye"
                            value={params.e}
                            onChange={handleChange}
                        />
                    </div>

                    <Input
                        id="p"
                        label="Probabilidad (p/q)"
                        type="number"
                        icon="fas fa-balance-scale"
                        value={params.p}
                        onChange={handleChange}
                    />

                    <Button onClick={calculate} className="w-full justify-center text-lg h-14 mt-2">
                        <i className="fas fa-calculator"></i> Calcular Ahora
                    </Button>
                </div>

                <div className="flex flex-col gap-6 h-full">
                    <div className="bg-gradient-to-br from-bg-light to-gray-100 border-2 border-blue-100 p-8 mt-0 relative overflow-hidden h-full flex flex-col justify-center min-h-[300px] flex">
                        <span className="text-xs text-accent uppercase font-extrabold tracking-widest block mb-2">Total Sugerido</span>
                        <div className="text-8xl font-black text-primary leading-none relative z-10 transition-all duration-500">
                            {result}
                        </div>
                        <p className="text-gray font-semibold text-sm">Sujetos Requeridos</p>
                        <div className="h-px bg-border my-4 w-full"></div>
                        <p className="mt-0 font-normal text-primary-light text-sm leading-relaxed">
                            {result > 0 ? "Tamaño de muestra calculado exitosamente." : "Ingresa los datos para ver el cálculo detallado."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-blue-50 text-blue-800 rounded-xl flex gap-3 text-sm mt-8 border border-blue-100 max-w-4xl mx-auto">
                <i className="fas fa-info-circle text-lg mt-0.5"></i>
                <p><b>Nota:</b> Utilizamos la corrección de Cochran para poblaciones finitas. El estándar recomendado es 95% de confianza y 5% de error.</p>
            </div>
        </div>
    );
};
