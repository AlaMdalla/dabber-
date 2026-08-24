export const metadata = {
  title: "Conditions d'utilisation",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Conditions d&apos;utilisation
      </h1>
      <p className="mt-2 text-sm text-muted">Dernière mise à jour : 2026-08-22</p>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="text-base font-semibold">1. Objet</h2>
          <p className="mt-2 text-muted">
            Dabber est une plateforme de mise en relation qui permet à des
            particuliers et des professionnels de publier des annonces de
            location de matériel et d&apos;équipements en Tunisie, et
            d&apos;échanger avec les personnes intéressées. En créant un
            compte ou en publiant une annonce, vous acceptez les présentes
            conditions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Rôle de Dabber</h2>
          <p className="mt-2 text-muted">
            Dabber met en relation les utilisateurs mais n&apos;est pas
            partie aux transactions de location conclues entre eux. Les
            prix, disponibilités, conditions de location, cautions et
            modalités de remise du matériel sont définis et confirmés
            directement entre le vendeur et le locataire. Dabber ne garantit
            pas l&apos;exactitude des annonces ni la bonne exécution des
            locations.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Compte utilisateur</h2>
          <p className="mt-2 text-muted">
            La connexion se fait avec votre adresse e-mail et votre mot de
            passe. Vous êtes responsable de l&apos;exactitude des informations
            affichées sur votre profil et de la confidentialité de vos
            identifiants de connexion.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Publication d&apos;annonces</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted">
            <li>
              Vous devez être en mesure de louer légalement le produit
              annoncé.
            </li>
            <li>
              Les informations fournies (description, prix, disponibilité,
              photos) doivent être exactes et à jour.
            </li>
            <li>
              Sont interdits : les annonces pour des biens illégaux ou
              dangereux, le contenu trompeur, offensant ou portant atteinte
              aux droits d&apos;un tiers.
            </li>
            <li>
              Vous pouvez modifier ou supprimer vos annonces à tout moment
              depuis votre compte.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Messagerie</h2>
          <p className="mt-2 text-muted">
            La messagerie intégrée est destinée aux échanges liés à une
            annonce. Tout usage abusif, harcelant ou frauduleux peut
            entraîner la suspension du compte concerné.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Suspension et suppression</h2>
          <p className="mt-2 text-muted">
            Nous pouvons suspendre ou supprimer un compte ou une annonce qui
            ne respecte pas ces conditions, sans préavis en cas
            d&apos;abus manifeste.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Droit applicable</h2>
          <p className="mt-2 text-muted">
            Les présentes conditions sont régies par le droit tunisien.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Contact</h2>
          <p className="mt-2 text-muted">
            Pour toute question sur ces conditions, contactez-nous à{" "}
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
