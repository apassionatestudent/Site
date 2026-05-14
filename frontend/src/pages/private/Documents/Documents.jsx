import React from 'react';

const documents = [
  {
    id: 1,
    title: 'Project Proposal',
    type: 'PDF',
    updatedAt: '2026-05-10',
  },
  {
    id: 2,
    title: 'Design Specification',
    type: 'DOCX',
    updatedAt: '2026-05-09',
  },
  {
    id: 3,
    title: 'Final Report',
    type: 'PDF',
    updatedAt: '2026-05-08',
  },
];

function Documents() {
  return (
    <main className="documents-page">
      <header className="documents-header">
        <h1>Documents</h1>
        <p>Browse and manage your shared documents.</p>
      </header>

      <section className="documents-list">
        {documents.length === 0 ? (
          <p>No documents available.</p>
        ) : (
          documents.map((document) => (
            <article key={document.id} className="document-card">
              <div className="document-card__content">
                <h2>{document.title}</h2>
                <p>Type: {document.type}</p>
                <p>Updated: {document.updatedAt}</p>
              </div>
              <button type="button" className="document-card__action">
                View
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default Documents;
