# Cloud Manager API Tutorial

This repository contains the completed tutorial for the Adobe Cloud Manager API. It accompanies the [documentation](https://www.adobe.io/apis/experiencecloud/cloud-manager/docs.html).

## Goal

The tutorial walks through the steps to build a basic integration with the Cloud Manager API. This integration receives events, via a webhook, from Cloud Manager and makes API calls back to Cloud Manager to receive more information. The specific use case in the tutorial is to send a message to a Slack channel when the CI/CD pipeline starts; the concepts used in the tutorial, however, are applicable to a wide variety of use cases. Similarly, although the tutorial is written in JavaScript, the concepts are applicable to any programming language.

## Steps

The tutorial is organized into a series of steps, the completion of which is it its own file.

| Step | Description                     | File       |
|------|---------------------------------|------------|
| 1    | Basic Webhook Setup             | `step1.js` |
| 2    | Webhook Signature Validation    | `step2.js` |
| 3    | Looking for Specific Event Type | `step3.js` |
| 4    | Getting an Access Token         | `step4.js` |
| 5    | Getting Execution Data          | `step5.js` |
| 6    | Getting Program Data            | `step6.js` |
| 7    | Notifying Slack                 | `step7.js` |

## Running

After cloning this repository, running any step can be done by running:

    $ npm install
    $ node <step file name>

## Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more information.
