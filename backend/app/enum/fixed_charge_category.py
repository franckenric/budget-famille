from enum import Enum


class FixedChargeCategory(Enum):
    logement = "logement"
    energie = "energie"
    abonnement = "abonnement"
    assurance = "assurance"
    autre = "autre"