export const metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Politique de confidentialité
      </h1>
      <p className="mt-2 text-sm text-muted">Dernière mise à jour : 2026-08-22</p>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="text-base font-semibold">1. Qui nous sommes</h2>
          <p className="mt-2 text-muted">
            Dabber est une plateforme qui met en relation des particuliers et
            des professionnels en Tunisie pour la location de matériel et
            d&apos;équipements. Cette page décrit les données que nous
            collectons lorsque vous utilisez le site, pourquoi nous les
            collectons, et comment vous pouvez les contrôler.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Données collectées</h2>
          <ul className="mt-2 list-disc space-y-2 ps-5 text-muted">
            <li>
              <span className="font-medium text-ink">
                Lors de la création de votre compte :
              </span>{" "}
              votre nom et votre adresse e-mail. Votre mot de passe est géré
              de manière sécurisée par notre service d&apos;authentification et
              n&apos;est jamais affiché publiquement.
            </li>
            <li>
              <span className="font-medium text-ink">Numéro WhatsApp :</span>{" "}
              si vous choisissez de l&apos;ajouter, il est affiché sur vos annonces
              afin que les personnes intéressées puissent vous contacter.
            </li>
            <li>
              <span className="font-medium text-ink">
                Lorsque vous publiez une annonce :
              </span>{" "}
              le nom du produit, sa description, sa catégorie, son
              gouvernorat, son prix, sa disponibilité et une photo que vous
              choisissez d&apos;ajouter.
            </li>
            <li>
              <span className="font-medium text-ink">
                Lorsque vous contactez un vendeur :
              </span>{" "}
              le contenu des messages échangés avec ce vendeur au sujet
              d&apos;une annonce.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">
            3. Comment nous utilisons ces données
          </h2>
          <ul className="mt-2 list-disc space-y-2 ps-5 text-muted">
            <li>Créer et sécuriser votre compte.</li>
            <li>
              Afficher vos annonces publiquement, avec votre nom et votre
              photo, afin que les autres utilisateurs sachent qui les
              propose.
            </li>
            <li>
              Vous permettre d&apos;échanger des messages avec d&apos;autres
              utilisateurs au sujet d&apos;une annonce.
            </li>
            <li>Assurer le bon fonctionnement et la sécurité du site.</li>
          </ul>
          <p className="mt-2 text-muted">
            Nous ne vendons pas vos données et ne les partageons pas à des
            fins publicitaires.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Où sont stockées les données</h2>
          <p className="mt-2 text-muted">
            Les données de compte, les annonces et les messages sont stockés
            chez notre hébergeur de base de données, Supabase. Les photos
            sont stockées dans le service de stockage de fichiers de
            Supabase. La création de compte et la connexion utilisent le
            service d&apos;authentification de Supabase.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Vos droits</h2>
          <p className="mt-2 text-muted">
            Vous pouvez modifier votre nom affiché à tout moment depuis votre
            page « Mon compte ». Vous pouvez supprimer vos annonces
            individuellement. Pour demander la suppression complète de votre
            compte et de vos données, contactez-nous à l&apos;adresse
            ci-dessous — nous traiterons votre demande dans un délai
            raisonnable.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Cookies</h2>
          <p className="mt-2 text-muted">
            Nous utilisons uniquement des cookies nécessaires au
            fonctionnement du site, notamment pour maintenir votre session
            connectée. Nous n&apos;utilisons pas de cookies publicitaires ou
            de suivi tiers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Contact</h2>
          <p className="mt-2 text-muted">
            Pour toute question concernant cette politique ou vos données,
            contactez-nous à{" "}
            <a
              href="mailto:contact@dabber.tn"
              className="font-medium text-ink underline underline-offset-2"
            >
              contact@dabber.tn
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
