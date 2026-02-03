import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { formatAPA } from '../../utils/citation';

export const ManualAPA = () => {
    const [type, setType] = useState('book');
    const [formData, setFormData] = useState({
        author: '',
        year: '',
        title: '',
        publisher: '',
        journal: '',
        url: ''
    });
    const [result, setResult] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const generateCitation = () => {
        // Adapt form data to formatAPA input structure if needed, 
        // or just format it directly here for manual cases which are specific

        let authorsList = formData.author.split(';').map(a => a.trim());
        if (authorsList.length === 1 && !authorsList[0]) authorsList = ["Autor Desconocido"];

        const meta = {
            authorsList,
            year: formData.year,
            title: formData.title,
            container: type === 'journal' ? formData.journal : formData.publisher,
            doi: type === 'web' ? formData.url : '' // formatAPA uses this for link
        };

        // If formatAPA expects specific fields, we might need a custom manual formatter
        // But let's try to reuse or adapt.
        // Simplified manual logic mirroring legacy scripts.js

        let citation = '';
        const authorStr = formData.author || "Autor, A. A.";
        const yearStr = formData.year ? `(${formData.year})` : "(s. f.)";
        const titleStr = formData.title ? `<i>${formData.title}</i>` : "<i>Título del trabajo</i>";

        if (type === 'book') {
            const pub = formData.publisher || "Editorial";
            citation = `${authorStr} ${yearStr}. ${titleStr}. ${pub}.`;
        } else if (type === 'journal') {
            const journal = formData.journal || "Nombre Revista";
            citation = `${authorStr} ${yearStr}. ${formData.title || "Título del artículo"}. ${titleStr}, xx(x), pp-pp. ${journal}.`;
            // Wait, legacy logic for journal: Author (Year). Title. Journal, Vol(Issue), pages.
            // My formatAPA utility is for "Web/Repo" mostly

            citation = `${authorStr} ${yearStr}. ${formData.title}. <i>${journal}</i>.`;
        } else {
            const url = formData.url || "http://...";
            citation = `${authorStr} ${yearStr}. <i>${formData.title}</i>. ${url}`;
        }

        setResult(citation);
    };

    return (
        <div className="bg-white p-10 rounded-3xl shadow-modal border border-border flex flex-col gap-6 animate-fadeIn">
            <div className="mb-8">
                <label className="block mb-3 font-bold text-primary">Tipo de Fuente</label>
                <select
                    className="w-full p-4 border-2 border-border rounded-xl text-base transition-colors focus:outline-none focus:border-accent bg-white"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                >
                    <option value="book">Libro</option>
                    <option value="journal">Artículo de Revista</option>
                    <option value="web">Página Web</option>
                </select>
            </div>

            <Input label="Autores (Apellido, Inicial. separados por ;)" name="author" placeholder="Ej: Perez, J.; Smith, M." value={formData.author} onChange={handleChange} />
            <Input label="Año de Publicación" name="year" type="number" placeholder="Ej: 2023" value={formData.year} onChange={handleChange} />
            <Input label={type === 'journal' ? "Título del Artículo" : "Título de la Obra"} name="title" placeholder="Título..." value={formData.title} onChange={handleChange} />

            {type === 'book' && (
                <Input label="Editorial" name="publisher" placeholder="Ej: Pearson" value={formData.publisher} onChange={handleChange} />
            )}

            {type === 'journal' && (
                <Input label="Nombre de la Revista" name="journal" placeholder="Ej: Revista de Psicología" value={formData.journal} onChange={handleChange} />
            )}

            {type === 'web' && (
                <Input label="URL" name="url" placeholder="https://..." value={formData.url} onChange={handleChange} />
            )}

            <Button onClick={generateCitation} className="w-full justify-center">
                Generar Cita APA
            </Button>

            {result && (
                <div className="bg-gray-50 p-8 border-l-4 border-accent mt-10 rounded-xl font-medium overflow-wrap break-word break-words animate-fadeIn">
                    <div dangerouslySetInnerHTML={{ __html: result }}></div>
                </div>
            )}
        </div>
    );
};
